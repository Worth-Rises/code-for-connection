# Code for Connection

## Voice Calls Guild

### What You're Building

Your guild is building the voice calling system that lets incarcerated people call their loved ones for free. The incarcerated person uses a tablet app to initiate a call. The call connects to the family member's personal phone number.

The family member hears a facility disclaimer (e.g., "This call originates from a correctional facility in New York"), accepts the call, and they talk. A timer counts down, an audio warning plays at one minute left, and the call auto-disconnects at the time limit.

Administrators can see active calls, terminate them, and manage contact approvals.

**Important context:**  
The family member receives the call on their regular phone, not through the Open Connect app. They don't see a timer or use the app during the call. Their app/web experience is limited to account management.

---

## How Your Work Connects to Other Guilds

- You share the `approved_contacts` table with the Video and Messaging guilds. A contact approved for calls is approved for everything.
- Your `voice_calls` table feeds into the Admin Platform’s unified dashboard.
- You use the same authentication and user profile system as everyone else.

---

## Required Scope

### Incarcerated Person Interface

| Feature                | Description                            |
| ---------------------- | -------------------------------------- |
| PIN authentication     | Enter 4-digit PIN to access the system |
| View approved contacts | See list of approved phone numbers     |
| Initiate outbound call | Select a contact and start a call      |

# Correctional Facility Call System – Feature Specification

This document outlines the functional features for a correctional facility telephone system.  
The system supports three primary user interfaces:

- Incarcerated Person Call Interface
- Family / Loved One Interface
- Facility Administrator Interface

---

# 1. Incarcerated Person Call Interface

Features available to incarcerated individuals when initiating or managing calls.

| Feature                  | Description                                                                  |
| ------------------------ | ---------------------------------------------------------------------------- |
| Call timer display       | Shows the remaining call time on screen.                                     |
| Time limit audio warning | Plays an audio warning when 1 minute of call time remains.                   |
| Auto-disconnect at limit | Automatically ends the call when the maximum time limit is reached.          |
| End call manually        | Allows the caller to hang up before the time limit expires.                  |
| Call history             | Displays a list of recent calls made by the incarcerated individual.         |
| Legal call option        | Allows a call to be flagged as an attorney call, which prohibits monitoring. |

---

# 2. Family / Loved One Interface

Features available to friends or family members receiving calls from incarcerated individuals.

| Feature                      | Description                                                                                                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account registration         | Create an account using email, phone number, and basic personal information.                                                                                            |
| Authentication               | Log in using registered credentials.                                                                                                                                    |
| View approved contacts       | See incarcerated individuals they are approved to receive calls from.                                                                                                   |
| Hear facility disclaimer     | Audio message informing the recipient that the call originates from a correctional facility (example: “This call originates from a correctional facility in New York”). |
| Accept / decline call prompt | The recipient must explicitly accept the call before the connection is established.                                                                                     |
| Block calls                  | Allows the user to opt out of receiving calls from the system.                                                                                                          |

---

# 3. Facility Administrator Interface

Administrative tools used by facility staff to manage the calling system.

| Feature                 | Description                                                                   |
| ----------------------- | ----------------------------------------------------------------------------- |
| View active calls       | Dashboard displaying all calls currently in progress.                         |
| Terminate active call   | Allows administrators to end any call currently in progress.                  |
| View call logs          | Provides access to historical call metadata.                                  |
| Search call logs        | Enables filtering call logs by user, date, or phone number.                   |
| Approve / deny contacts | Review and approve or deny contact requests for each incarcerated individual. |
| View pending approvals  | Displays a queue of contact requests awaiting administrative approval.        |

---

# Notes

- Call monitoring restrictions apply to calls flagged as legal/attorney calls.
- Audio disclaimers are played before call connection to comply with facility regulations.
- Contact approval workflows ensure only authorized individuals can communicate with incarcerated persons.

| Feature                    | Description                                 |
| -------------------------- | ------------------------------------------- |
| Block/unblock phone number | Block or unblock a number at facility level |
| Mark call as legal         | Flag attorney calls as privileged           |
| Three-way call detection   | Detect call forwarding and drop the call    |

## Optional Scope

| Feature                      | Description                                                                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Speed dial: PREA hotline     | Quick access to report abuse                                                                                                                                                                         |
| Speed dial: Crisis hotline   | Quick access to mental health support                                                                                                                                                                |
| Request new contact          | Submit request to add a contact                                                                                                                                                                      |
| PIN reset request            | Request a new PIN                                                                                                                                                                                    |
| Voicemail/callback request   | Leave a message if unavailable. For security, voicemail must live within the Open Connect app (not external voicemail systems). Messages are stored in-app and accessible only to approved contacts. |
| Monitor/record compatibility | Design hooks so monitoring services could plug in later                                                                                                                                              |
| Restrictive housing limits   | Different call rules based on unit type                                                                                                                                                              |
| Generate reports             | Basic usage statistics                                                                                                                                                                               |

## Your Demo Should Show

1. Incarcerated person logs in with PIN and sees their approved contacts
2. They initiate a call to a family member
3. Family member hears the facility disclaimer (e.g., "This call originates from a correctional facility in New York") and accepts
4. Call connects with clear audio
5. Timer counts down on the tablet screen
6. Audio warning plays at 1 minute remaining
7. Call auto-disconnects at the time limit (or either party hangs up)
8. Admin sees the call in their dashboard and could terminate it
9. Call appears in the incarcerated person's call history
