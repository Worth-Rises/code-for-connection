import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import { prisma } from '@openconnect/shared';

export const twimlRouter = Router();

const VoiceResponse = twilio.twiml.VoiceResponse;

/** Base URL for Twilio to fetch name-audio (must be public). Uses PUBLIC_URL. */
function getPublicBaseUrl(): string | null {
  const base = process.env.PUBLIC_URL;
  if (!base) return null;
  return base.replace(/\/$/, '');
}

/**
 * GET /twiml/name-audio/:callId — Stream the incarcerated person's recorded name audio.
 * Called by Twilio when executing <Play> in the greeting. No auth — validated by callId.
 */
twimlRouter.get('/name-audio/:callId', async (req: Request, res: Response) => {
  const { callId } = req.params;
  console.log(`[twiml] === NAME-AUDIO REQUEST === callId=${callId}`);
  try {
    const call = await prisma.voiceCall.findUnique({
      where: { id: callId },
      select: {
        incarceratedPerson: {
          select: {
            nameAudioBytes: true,
            nameAudioContentType: true,
            nameAudioApproved: true,
          },
        },
      },
    });

    const person = call?.incarceratedPerson as
      | { nameAudioBytes?: Buffer | null; nameAudioContentType?: string | null; nameAudioApproved?: boolean }
      | undefined;

    console.log(`[twiml] name-audio lookup: callId=${callId} callFound=${!!call} approved=${person?.nameAudioApproved ?? 'N/A'} contentType=${person?.nameAudioContentType ?? 'N/A'} audioSize=${person?.nameAudioBytes?.length ?? 0} bytes`);

    if (
      !person?.nameAudioApproved ||
      person.nameAudioBytes == null ||
      person.nameAudioBytes.length === 0
    ) {
      console.warn(`[twiml] name-audio NOT AVAILABLE for callId=${callId}: approved=${person?.nameAudioApproved} hasBytes=${person?.nameAudioBytes != null} byteLen=${person?.nameAudioBytes?.length ?? 0}`);
      res.status(404).send('Name audio not available');
      return;
    }

    const contentType = person.nameAudioContentType || 'audio/mpeg';
    const buffer = Buffer.isBuffer(person.nameAudioBytes)
      ? person.nameAudioBytes
      : Buffer.from(person.nameAudioBytes as ArrayBuffer);
    console.log(`[twiml] name-audio SENDING: callId=${callId} contentType=${contentType} bufferSize=${buffer.length} bytes`);
    res.set('Cache-Control', 'no-store');
    res.type(contentType).send(buffer);
  } catch (error) {
    console.error(`[twiml] Error serving name-audio for call ${callId}:`, error);
    res.status(500).send('Error');
  }
});

/**
 * POST /twiml/greeting/:callId — Initial IVR greeting.
 *
 * Twilio fetches this URL when the phone call is answered.
 * Plays an automated announcement and gathers DTMF input:
 *   1 = Accept call (join conference)
 *   2 = Reject call (hang up)
 *   3 = Block future calls from this person
 *
 * No auth — called directly by Twilio.
 */
twimlRouter.post('/greeting/:callId', async (req: Request, res: Response) => {
  const { callId } = req.params;
  console.log(`[twiml] === GREETING REQUEST === callId=${callId}`);

  try {
    const call = await prisma.voiceCall.findUnique({
      where: { id: callId },
      include: {
        incarceratedPerson: { include: { facility: true } },
      },
    });

    if (!call) {
      console.warn(`[twiml] greeting: call ${callId} not found in DB`);
      const twiml = new VoiceResponse();
      twiml.say('Sorry, this call is no longer available.');
      twiml.hangup();
      res.type('text/xml').send(twiml.toString());
      return;
    }

    const facilityName = call.incarceratedPerson.facility.name;
    const person = call.incarceratedPerson as typeof call.incarceratedPerson & {
      nameAudioBytes?: Buffer | null;
      nameAudioContentType?: string | null;
      nameAudioApproved?: boolean;
    };

    // Check if the announcement should include the person's name
    const nameSetting = await prisma.systemConfiguration.findUnique({
      where: { key: 'announcement_include_name' },
    });
    const includeName = nameSetting?.value === 'YES';

    const hasApprovedNameAudio =
      includeName &&
      person.nameAudioApproved &&
      person.nameAudioBytes != null &&
      person.nameAudioBytes.length > 0;
    const publicBase = getPublicBaseUrl();

    console.log(`[twiml] greeting decision: callId=${callId} includeName=${includeName} (setting=${nameSetting?.value ?? 'NOT SET'}) nameAudioApproved=${person.nameAudioApproved} audioSize=${person.nameAudioBytes?.length ?? 0} hasApprovedNameAudio=${hasApprovedNameAudio} publicBase=${publicBase ?? 'NULL'}`);

    const twiml = new VoiceResponse();
    const gather = twiml.gather({
      numDigits: 1,
      action: `/api/voice/twiml/handle-key/${callId}`,
      method: 'POST',
    });

    if (hasApprovedNameAudio && publicBase) {
      // Play recorded name audio, then TTS for facility and instructions
      const audioUrl = `${publicBase}/api/voice/twiml/name-audio/${callId}`;
      console.log(`[twiml] greeting: PLAYING recorded name audio from ${audioUrl}`);
      gather.say({ voice: 'Polly.Joanna' }, 'You are receiving a call from');
      gather.play({}, audioUrl);
      gather.say(
        { voice: 'Polly.Joanna' },
        ` at ${facilityName}. Press 1 to accept this call. Press 2 to decline. Press 3 to block future calls from this person.`,
      );
    } else {
      // Fallback: full greeting via text-to-speech
      const greeting = includeName
        ? `You are receiving a call from ${person.firstName} ${person.lastName} at ${facilityName}.`
        : `You are receiving a call from someone who is incarcerated at ${facilityName}.`;
      console.log(`[twiml] greeting: USING TTS fallback (includeName=${includeName}, hasApprovedNameAudio=${hasApprovedNameAudio}, publicBase=${publicBase ?? 'NULL'})`);
      gather.say(
        { voice: 'Polly.Joanna' },
        `${greeting} Press 1 to accept this call. Press 2 to decline. Press 3 to block future calls from this person.`,
      );
    }

    // If no input, replay the greeting
    twiml.redirect(`/api/voice/twiml/greeting/${callId}`);

    const twimlXml = twiml.toString();
    console.log(`[twiml] greeting TwiML response for callId=${callId}:\n${twimlXml}`);
    res.type('text/xml').send(twimlXml);
  } catch (error) {
    console.error(`[twiml] Error in greeting for call ${callId}:`, error);
    const twiml = new VoiceResponse();
    twiml.say('An error occurred. Please try again later.');
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
  }
});

/**
 * POST /twiml/handle-key/:callId — Process the initial keypress.
 *
 *   Digit 1 → Accept: join the conference
 *   Digit 2 → Reject: hang up, mark call as rejected
 *   Digit 3 → Block: play confirmation prompt
 *   Other   → Replay the greeting
 */
twimlRouter.post('/handle-key/:callId', async (req: Request, res: Response) => {
  const { callId } = req.params;
  const digit = req.body.Digits;

  console.log(`[twiml] handle-key callId=${callId} digit=${digit}`);

  try {
    const twiml = new VoiceResponse();

    if (digit === '1') {
      // Accept — join the conference
      console.log(`[twiml] Call ${callId}: receiver accepted, joining conference`);

      await prisma.voiceCall.update({
        where: { id: callId },
        data: { status: 'connected', connectedAt: new Date() },
      });

      const conferenceName = `call-${callId}`;
      const dial = twiml.dial();
      dial.conference(
        {
          endConferenceOnExit: true,
          startConferenceOnEnter: true,
          beep: 'false',
        },
        conferenceName,
      );
    } else if (digit === '2') {
      // Reject — hang up
      console.log(`[twiml] Call ${callId}: receiver rejected`);

      const call = await prisma.voiceCall.findUnique({ where: { id: callId } });
      if (call && ['ringing', 'connected'].includes(call.status)) {
        await prisma.voiceCall.update({
          where: { id: callId },
          data: {
            status: 'rejected',
            endedAt: new Date(),
            endedBy: 'receiver',
          },
        });
      }

      // Terminate the conference so the tablet side is notified
      try {
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN,
        );
        if (call?.conferenceSid) {
          await client.conferences(call.conferenceSid).update({ status: 'completed' });
        } else {
          const conferences = await client.conferences.list({
            friendlyName: `call-${callId}`,
            status: 'in-progress',
          });
          for (const conf of conferences) {
            await conf.update({ status: 'completed' });
          }
        }
      } catch (err) {
        console.error(`[twiml] Error terminating conference for rejected call ${callId}:`, err);
      }

      twiml.say({ voice: 'Polly.Joanna' }, 'Goodbye.');
      twiml.hangup();
    } else if (digit === '3') {
      // Block — ask for confirmation
      console.log(`[twiml] Call ${callId}: receiver wants to block, asking confirmation`);

      const gather = twiml.gather({
        numDigits: 1,
        action: `/api/voice/twiml/confirm-block/${callId}`,
        method: 'POST',
      });
      gather.say(
        { voice: 'Polly.Joanna' },
        'Are you sure you want to block future calls from this person? Press 1 to confirm. Press 2 to cancel.',
      );

      // If no input, go back to greeting
      twiml.redirect(`/api/voice/twiml/greeting/${callId}`);
    } else {
      // Invalid input — replay greeting
      twiml.redirect(`/api/voice/twiml/greeting/${callId}`);
    }

    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error(`[twiml] Error in handle-key for call ${callId}:`, error);
    const twiml = new VoiceResponse();
    twiml.say('An error occurred. Please try again later.');
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
  }
});

/**
 * POST /twiml/confirm-block/:callId — Process block confirmation.
 *
 *   Digit 1 → Confirm block: mark contact as blocked_by_receiver, end call
 *   Digit 2 → Cancel: go back to greeting
 */
twimlRouter.post('/confirm-block/:callId', async (req: Request, res: Response) => {
  const { callId } = req.params;
  const digit = req.body.Digits;

  console.log(`[twiml] confirm-block callId=${callId} digit=${digit}`);

  try {
    const twiml = new VoiceResponse();

    if (digit === '1') {
      // Confirm block
      console.log(`[twiml] Call ${callId}: receiver confirmed block`);

      const call = await prisma.voiceCall.findUnique({ where: { id: callId } });

      if (call) {
        // Mark the approved contact as blocked by receiver
        await prisma.approvedContact.updateMany({
          where: {
            incarceratedPersonId: call.incarceratedPersonId,
            familyMemberId: call.familyMemberId,
          },
          data: { status: 'blocked_by_receiver' },
        });

        // Update the call record
        await prisma.voiceCall.update({
          where: { id: callId },
          data: {
            status: 'blocked_by_receiver',
            endedAt: new Date(),
            endedBy: 'blocked',
          },
        });

        // Terminate the conference so the tablet side is notified
        try {
          const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN,
          );
          if (call.conferenceSid) {
            await client.conferences(call.conferenceSid).update({ status: 'completed' });
          } else {
            const conferences = await client.conferences.list({
              friendlyName: `call-${callId}`,
              status: 'in-progress',
            });
            for (const conf of conferences) {
              await conf.update({ status: 'completed' });
            }
          }
        } catch (err) {
          console.error(`[twiml] Error terminating conference for blocked call ${callId}:`, err);
        }
      }

      twiml.say({ voice: 'Polly.Joanna' }, 'This number has been blocked. Goodbye.');
      twiml.hangup();
    } else {
      // Cancel — go back to greeting
      twiml.redirect(`/api/voice/twiml/greeting/${callId}`);
    }

    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error(`[twiml] Error in confirm-block for call ${callId}:`, error);
    const twiml = new VoiceResponse();
    twiml.say('An error occurred. Please try again later.');
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
  }
});

export default twimlRouter;
