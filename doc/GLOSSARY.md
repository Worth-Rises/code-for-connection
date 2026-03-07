# Glossary

This glossary defines terms you will encounter in the Code for Connection codebase and in conversations about correctional facility communication systems. It is written for someone new to both the domain and the technology.

---

## Domain Terms

**Agency**
A state department (for example, NY DOCCS) that oversees multiple correctional facilities.

**Approved contact**
A family member or other person who has been verified and authorized to communicate with a specific incarcerated person.

**Facility**
A single correctional institution (for example, Sing Sing).

**Guild**
A self-contained feature module in the codebase. Each guild (voice, video, messaging, admin) has its own API routes and UI components.

**Housing unit**
A section within a facility. Different unit types may have different communication rules, such as call duration limits or permitted hours.

**Incarcerated person / Resident**
Someone currently held in a correctional facility who uses the tablet interface to communicate with approved contacts.

**Pending review**
A message state where content is waiting for an administrator to approve it before it is delivered to the recipient.

**PSTN (Public Switched Telephone Network)**
The regular phone system that most people use at home. Twilio bridges internet-based calls to the PSTN so that approved contacts can receive calls on ordinary phone numbers.

**Signaling**
The process of coordinating call setup (who is calling whom, when to connect) before actual audio or video begins flowing.

---

## Technical Terms

**API (Application Programming Interface)**
A set of URLs that the frontend calls to retrieve data or trigger actions on the server.

**API Gateway**
The Express server that receives incoming HTTP requests and routes them to the correct guild backend.

**Docker**
A tool that packages an application and all of its dependencies into a container, so it runs the same way on any machine.

**ECS (Elastic Container Service)**
An AWS service that runs Docker containers without requiring you to manage the underlying servers.

**Express**
The Node.js web framework used for the API server in this project.

**JWT (JSON Web Token)**
An encoded token sent with each request to prove the user's identity. The server checks this token to decide whether the request is allowed.

**ORM (Object-Relational Mapping)**
A layer that lets you write database queries in TypeScript instead of raw SQL.

**Prisma**
The specific ORM used in this project. Its schema is defined in `prisma/schema.prisma`.

**RDS (Relational Database Service)**
An AWS managed PostgreSQL database. It handles backups, patching, and scaling so you do not have to run a database server yourself.

**React**
The JavaScript library used to build the user interface in this project.

**Redis**
An in-memory data store used here for real-time signaling pub/sub (publishing and subscribing to messages between services).

**Socket.IO**
A library for real-time, two-way communication between the browser and the server. It is used for call signaling in this project.

**Terraform**
An infrastructure-as-code tool that creates and manages cloud resources from configuration files, so infrastructure changes are reviewable and repeatable.

**Twilio**
A third-party service that connects internet-based calls to regular phone numbers on the PSTN.

**Vite**
The build tool that bundles the React frontend for both development and production.

**WebRTC (Web Real-Time Communication)**
A browser technology that enables peer-to-peer video and audio calls without requiring a plugin.
