# Video Calls Guild

## What You're Building

Your guild is building the video calling system. Family members schedule video calls through the web portal by requesting a time slot. An administrator approves the request (or it's auto-approved based on rules). The incarcerated person gets a notification and sees the scheduled call. At the scheduled time, both parties join a WebRTC video call with camera, microphone, and background blur controls. A timer counts down and the call auto-disconnects at the limit.

> **Important context:** We use "video calls," not "video visits." "Video visit" is industry language created to justify eliminating in-person visits.

## Platforms

| Interface | App | Platform | Path |
|---|---|---|---|
| Incarcerated Person | Android tablet app | Vite/React targeting JP6 (1280x800) | `apps/tablet` |
| Family/Loved One | PWA | Vite/React, browser-based | `apps/web` |
| Facility Administrator | Dashboard | Browser-based | `guilds/admin` |

Video calling guild logic lives in `guilds/video`.

## How Your Work Connects to Other Guilds

- You share the `approved_contacts` table with the Voice and Messaging guilds.
- Your `video_calls` table feeds into the Admin Platform's unified dashboard.
- You depend on the Admin Platform's `video_call_time_slots` configuration for available scheduling windows.
- You use the same authentication and user profile system as everyone else.

## Required Scope

### Incarcerated Person Interface

| Feature | Description |
|---|---|
| PIN authentication | Enter PIN to access the system |
| View scheduled video calls | See upcoming video calls |
| Alert for scheduled call | Notification when a loved one schedules a call |
| Join video call | Enter call at scheduled time |
| Video toggle | Turn camera on/off |
| Video background blur | Blur background (so kids don't see the prison environment) |
| Audio toggle | Mute/unmute microphone |
| Call timer display | Show time remaining |
| Auto-disconnect at limit | Call ends at time limit |
| End call manually | Leave early |
| Call history | View past video calls |
| Legal video call | Attorney call (prohibits monitoring) |

### Family/Loved One Interface

| Feature | Description |
|---|---|
| Account registration | Create account (shared with voice/messaging) |
| Authentication | Login with credentials |
| View approved contacts | See incarcerated individuals they can video call |
| Request video call | Submit request for a specific date/time slot |
| View available time slots | See open scheduling windows |
| Scheduled calls | See upcoming confirmed calls |
| Join video call | Enter call at scheduled time |
| Video toggle | Turn camera on/off |
| Video background blur | Blur background |
| Audio toggle | Mute/unmute microphone |
| End call | Leave video call |
| Call history | View past video calls |

### Facility Administrator Interface

| Feature | Description |
|---|---|
| Authentication | Admin login |
| View active video calls | Dashboard of calls in progress |
| Terminate active call | End any call in progress |
| View call logs | Historical call data |
| Approve/deny contact requests | Review contacts (per incarcerated person) |
| View pending requests | Queue of requests awaiting approval |
| Manage scheduling capacity | Set max concurrent calls |
| Automated scheduling | Auto-approve requests when approved caller + available slot |

## Optional Scope

| Feature | Description |
|---|---|
| Ambient noise cancelling | Reduce background noise on both sides |
| Voice captioning | Real-time speech-to-text captions |
| Real-time translation | Audio and caption translation for cross-language calls |
| Technical requirements check | Verify camera, mic, bandwidth before call |
| Reschedule/cancel call | Change or cancel a scheduled call |
| Monitor/record compatibility | Design hooks so monitoring services could plug in later |
| Quality metrics | Track connection quality and drop rates |

## Your Demo Should Show

1. Family member logs in and requests a video call for a specific time slot [ ]
2. Admin approves the request (or it auto-approves) [ ]
3. Incarcerated person sees the scheduled call and gets a notification [ ]
4. Both parties join at the scheduled time [ ]
5. Video and audio work, both can toggle camera/mic [ ]
6. Both sides can use background blur [ ]
7. Timer shows remaining time [ ]
8. Call ends at the limit or when either party leaves [ ]
9. Admin can see active calls in their dashboard [ ]
