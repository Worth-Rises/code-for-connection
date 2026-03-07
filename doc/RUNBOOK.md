# Code for Connection: Operational Runbook

This runbook contains step-by-step procedures for deploying, maintaining, and troubleshooting Code for Connection. Each procedure is written so that someone who can follow instructions can complete it without needing to understand every underlying detail.

---

## 1. Deploy from Scratch (Local Development)

**When to use this:** You are setting up the application on your computer for the first time.

**Prerequisites:** Git, Node.js 20+, Docker Desktop (running), and npm installed on your machine.

**Steps:**

1. Clone the repository:
   ```bash
   git clone <repository-url> code-for-connection
   cd code-for-connection
   ```

2. Create your environment file from the example:
   ```bash
   cp .env.example .env
   ```

3. Open `.env` in a text editor and set the `DATABASE_URL` line to:
   ```
   DATABASE_URL=postgresql://openconnect:hackathon2026@localhost:5432/openconnect
   ```

4. Set a JWT secret (any string will work for local development):
   ```
   JWT_SECRET=local-dev-secret-change-in-production
   ```

5. Start PostgreSQL and Redis in Docker:
   ```bash
   docker compose up -d postgres redis
   ```

6. Install all dependencies:
   ```bash
   npm install
   ```

7. Build the shared packages (order matters):
   ```bash
   npm run build -w @openconnect/shared
   npm run build -w @openconnect/ui
   ```

8. Run database migrations to create all tables:
   ```bash
   npx prisma migrate dev --name init
   ```

9. Seed the database with test data:
   ```bash
   npm run db:seed
   ```

10. Start the development servers:
    ```bash
    npm run dev
    ```

11. Open your browser to http://localhost:5173 and verify you see the application.

**Test credentials (seeded data):**

| Role | Login | Password/PIN |
|------|-------|--------------|
| Admin | admin@nydocs.gov | admin123 |
| Incarcerated person | PIN | 1234 |
| Family member | alice@example.com | password123 |

**What can go wrong:**

- **"Cannot connect to the Docker daemon"**: Docker Desktop is not running. Open Docker Desktop, wait for it to finish starting, then re-run step 5.
- **"Port 5432 is already in use"**: Another PostgreSQL instance is using that port. Stop it with `lsof -i :5432` to find the process ID, then `kill <PID>`. Re-run step 5.
- **`npm install` fails with permission errors**: Do not run npm with `sudo`. If you see `EACCES` errors, fix your npm permissions: https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally
- **`prisma migrate dev` fails with "Can't reach database"**: PostgreSQL is not ready yet. Wait 10 seconds and try again. Verify it is running with `docker compose ps` (the postgres container should show "healthy").
- **`prisma migrate dev` fails with "database does not exist"**: The Docker container creates the `openconnect` database automatically. If it did not, run `docker compose down -v` then `docker compose up -d postgres redis` to start fresh.

---

## 2. Deploy to Production (AWS)

**When to use this:** You are deploying the application to AWS for the first time, or redeploying after infrastructure changes.

**Prerequisites:** AWS CLI installed and configured (`aws configure`), Terraform 1.0+ installed, sufficient AWS IAM permissions (VPC, ECS, RDS, ElastiCache, ALB, ECR).

**Steps:**

1. Configure AWS CLI with your credentials:
   ```bash
   aws configure
   ```
   Enter your Access Key ID, Secret Access Key, region (`us-east-1`), and output format (`json`).

2. Navigate to the Terraform directory:
   ```bash
   cd deploy/terraform
   ```

3. Create a `terraform.tfvars` file with your secrets (never commit this file):
   ```
   db_password = "your-secure-database-password"
   jwt_secret  = "your-long-random-jwt-secret-32-chars-minimum"
   ```

4. Initialize Terraform (downloads required providers):
   ```bash
   terraform init
   ```

5. Preview what Terraform will create:
   ```bash
   terraform plan
   ```
   Review the output. It should list resources to be created (VPC, subnets, security groups, RDS, ECS, etc.).

6. Apply the infrastructure:
   ```bash
   terraform apply
   ```
   Type `yes` when prompted to confirm.

7. After Terraform completes, run database migrations against the production database:
   ```bash
   DATABASE_URL="postgresql://openconnect:<db_password>@<rds-endpoint>:5432/openconnect" npx prisma migrate deploy
   ```
   Replace `<db_password>` with your database password and `<rds-endpoint>` with the RDS endpoint from the Terraform output.

8. Verify the health check by accessing the ALB URL shown in Terraform outputs.

**What can go wrong:**

- **"Insufficient permissions"**: Your IAM user is missing required policies. Ask your AWS administrator to attach the necessary permissions for VPC, ECS, RDS, ElastiCache, ALB, and ECR.
- **"Terraform state lock"**: Another person is running Terraform at the same time. Wait for them to finish, or if the lock is stale, run `terraform force-unlock <LOCK_ID>` (the lock ID is shown in the error message).
- **Database migration fails**: Verify the `DATABASE_URL` is correct. Check that the RDS instance is in the "Available" state in the AWS console. Ensure the security group allows connections from the machine running the migration.

---

## 3. Add a New Facility

**When to use this:** A new correctional facility needs to be added to the system.

**Prerequisites:** The agency that operates the facility must already exist in the database. You need database access (Prisma Studio or direct SQL).

**Steps:**

1. Open Prisma Studio to browse and edit the database:
   ```bash
   npm run db:studio
   ```

2. In Prisma Studio, navigate to the **Agency** table. Copy the `id` of the agency this facility belongs to.

3. Navigate to the **Facility** table and click "Add record." Fill in:
   - `agencyId`: paste the agency ID from step 2
   - `name`: the facility name (e.g., "Riverside Correctional Facility")
   - `announcementText`: a welcome message played to callers (e.g., "This call is from Riverside Correctional Facility.")

4. Navigate to the **HousingUnitType** table. Create at least one housing unit type for this facility's agency (if one does not already exist). Fill in:
   - `agencyId`: the same agency ID
   - `name`: e.g., "General Population"
   - `voiceCallDurationMinutes`: e.g., 30
   - `videoCallDurationMinutes`: e.g., 30
   - `callingHoursStart`: e.g., "08:00"
   - `callingHoursEnd`: e.g., "22:00"
   - `maxContacts`: e.g., 10

5. Navigate to the **HousingUnit** table. Create at least one housing unit for the new facility:
   - `facilityId`: the new facility's ID
   - `unitTypeId`: the housing unit type ID from step 4
   - `name`: e.g., "Block A"

**What can go wrong:**

- **"Foreign key constraint failed on the field: agency_id"**: The agency ID you entered does not exist. Double-check the ID in the Agency table.
- **"Unique constraint failed"**: A facility with that exact name already exists under the same agency. Use a different name or verify you are not creating a duplicate.

---

## 4. Onboard a New Admin User

**When to use this:** A new staff member needs admin access to the system.

**Prerequisites:** The agency (and facility, if this is a facility admin) must already exist. You need database access.

**Steps:**

1. Open Prisma Studio:
   ```bash
   npm run db:studio
   ```

2. Navigate to the **Agency** table. Copy the `id` of the agency this admin belongs to.

3. If the admin will be a `facility_admin`, navigate to the **Facility** table and copy the `id` of their facility.

4. Generate a password hash. Run this command in your terminal:
   ```bash
   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('temporary-password', 10).then(h => console.log(h));"
   ```
   Copy the output (it starts with `$2a$`).

5. Navigate to the **AdminUser** table and click "Add record." Fill in:
   - `email`: the admin's email address
   - `passwordHash`: paste the hash from step 4
   - `firstName`: the admin's first name
   - `lastName`: the admin's last name
   - `role`: either `agency_admin` (can manage all facilities in the agency) or `facility_admin` (can manage one facility)
   - `agencyId`: the agency ID from step 2
   - `facilityId`: the facility ID from step 3 (required for `facility_admin`, leave empty for `agency_admin`)

6. Tell the admin their temporary password and ask them to change it after first login.

**What can go wrong:**

- **Admin cannot see any facilities**: They were assigned `facility_admin` but no `facilityId` was set. Edit their record and add the correct facility ID.
- **Admin sees too much data**: They were assigned `agency_admin` when they should be `facility_admin`. Edit their `role` field.
- **"Unique constraint failed on email"**: An admin with that email address already exists. Check the AdminUser table for the existing record.

---

## 5. Investigate a Failed Voice Call

**When to use this:** A user reports that a voice call did not connect or was cut off unexpectedly.

**Prerequisites:** The call ID or approximate time of the call, and database access.

**Steps:**

1. Open Prisma Studio:
   ```bash
   npm run db:studio
   ```

2. Navigate to the **VoiceCall** table (mapped to `voice_calls` in the database).

3. Find the call record. Search by call ID if you have it, or filter by `incarceratedPersonId`, `familyMemberId`, or `startedAt` date range.

4. Check the `status` field. Possible values:
   - `ringing`: The call was initiated but never connected.
   - `connected`: The call connected (check `endedAt` and `endedBy` to see how it ended).
   - `completed`: The call ended normally.
   - `missed`: The recipient did not answer.
   - `terminated_by_admin`: An admin ended the call. Check `terminatedByAdminId` to see who.

5. If the status is `ringing` and the call is old (more than a few minutes), check the signaling server logs:
   ```bash
   docker compose logs signaling
   ```

6. If the status is `missed`, check the Twilio dashboard at https://console.twilio.com for delivery errors on the outbound call.

**What can go wrong:**

- **Call stuck in "ringing" forever**: The signaling server lost track of the call. This is a WebSocket issue. Restart the signaling server: `docker compose restart signaling`.
- **Status is "missed" but the user says they were available**: Twilio could not reach the phone number. Check the Twilio console for error codes (e.g., invalid number, carrier rejection).
- **Status is "terminated_by_admin"**: This is intentional. Look up the admin ID in the AdminUser table to see who terminated it and contact them for the reason.

---

## 6. Investigate a Failed Video Call

**When to use this:** A user reports that a video call did not work or was never approved.

**Prerequisites:** The call ID or approximate time, and database access.

**Steps:**

1. Open Prisma Studio:
   ```bash
   npm run db:studio
   ```

2. Navigate to the **VideoCall** table (mapped to `video_calls` in the database).

3. Find the call record by ID or by filtering on `incarceratedPersonId`, `familyMemberId`, or `scheduledStart`.

4. Check the `status` field. Possible values:
   - `requested`: The call was requested but not yet approved by an admin.
   - `approved`: Approved but not yet started.
   - `denied`: An admin denied the request.
   - `scheduled`: Approved and scheduled for a specific time.
   - `in_progress`: Currently active.
   - `completed`: Ended normally.
   - `missed`: Neither party joined at the scheduled time.
   - `terminated_by_admin`: An admin ended the call.

5. If the status is `requested` and the call time has passed, the call was never reviewed. Check with facility staff about their review queue.

6. If the status is `approved` or `scheduled` but the call never started, the issue is likely WebRTC connectivity. Check browser console logs on both ends for ICE connection failures.

**What can go wrong:**

- **Call stuck in "requested"**: No admin has reviewed the video call queue. Contact facility staff to review pending requests.
- **"denied" with no explanation**: Look up the `approvedBy` field (which admin denied it) and ask them for the reason.
- **WebRTC connection failed**: This typically means a firewall is blocking peer-to-peer connections. Verify that TURN server credentials are configured and working.

---

## 7. Investigate a Stuck Message (pending_review)

**When to use this:** A user reports that their message was sent but never delivered.

**Prerequisites:** The conversation ID or user IDs, and database access.

**Steps:**

1. Open Prisma Studio:
   ```bash
   npm run db:studio
   ```

2. Navigate to the **Message** table (mapped to `messages` in the database).

3. Filter by `status` = `pending_review` and the relevant `conversationId` or `senderId`.

4. Check the `reviewedBy` field:
   - If it is empty, no admin has reviewed this message yet.
   - If it is set and the status is still `pending_review`, there may be a bug in the review workflow.

5. Navigate to the **Conversation** table. Find the conversation by its ID and check:
   - `isBlocked`: if `true`, all messages in this conversation are held. Check `blockedBy` to find which admin blocked it.

6. If the conversation is not blocked and no admin has reviewed, the issue is that the admin review queue is not being monitored. Contact facility staff.

**What can go wrong:**

- **No admin is reviewing the message queue**: This is an operational issue. Facility staff need to regularly check and review pending messages in the admin interface.
- **Conversation is blocked**: An admin blocked this conversation. Look up the admin in the AdminUser table using the `blockedBy` ID, and contact them to understand why.
- **Message has a `reviewedBy` value but is still `pending_review`**: This may indicate a bug. Check the API gateway logs for errors during the review process: `docker compose logs api-gateway` (if running in Docker) or check your application logs.

---

## 8. Roll Back a Bad Deploy

**When to use this:** A deployment introduced a bug and you need to revert to the previous working version.

**Prerequisites:** Knowledge of the previous working image tag or commit hash.

### Local / Docker Compose

**Steps:**

1. Stop the current deployment:
   ```bash
   docker compose down
   ```

2. Check out the previous known-good version of the code:
   ```bash
   git log --oneline -10
   ```
   Find the commit hash of the last good version, then:
   ```bash
   git checkout <commit-hash>
   ```

3. Rebuild and restart:
   ```bash
   npm install
   npm run build -w @openconnect/shared
   npm run build -w @openconnect/ui
   docker compose up -d postgres redis
   npm run dev
   ```

### AWS / ECS

**Steps:**

1. If you deployed with Terraform and changed the container image tag, update `terraform.tfvars` to use the previous image tag, then:
   ```bash
   cd deploy/terraform
   terraform apply
   ```

2. Alternatively, use the AWS CLI to roll back the ECS service to the previous task definition:
   ```bash
   aws ecs describe-services --cluster code-for-connection-production --services api-gateway --query "services[0].taskDefinition"
   ```
   This shows the current task definition. Find the previous revision number (subtract 1) and update:
   ```bash
   aws ecs update-service --cluster code-for-connection-production --service api-gateway --task-definition <previous-task-definition-arn>
   ```

**What can go wrong:**

- **Database migrations were run and cannot be reverted easily**: If the bad deploy included a database migration, rolling back the code without rolling back the database may cause errors. Check the `prisma/migrations` folder to understand what changed.
- **Terraform state conflicts**: If someone else is running Terraform, you will get a state lock error. Wait for them to finish or use `terraform force-unlock <LOCK_ID>`.

---

## 9. Rotate the JWT Secret

**When to use this:** The JWT secret has been compromised, or it is time for a routine rotation. Note: all users will be logged out.

**Prerequisites:** Access to the `.env` file (local) or Terraform variables (production).

**Steps:**

1. Generate a new random secret:
   ```bash
   openssl rand -base64 32
   ```

2. **Local:** Update the `JWT_SECRET` value in your `.env` file with the new secret.

   **Production:** Update the `jwt_secret` value in `deploy/terraform/terraform.tfvars` with the new secret.

3. Restart the API gateway:

   **Local:**
   ```bash
   # Stop and restart the dev servers (Ctrl+C if running, then:)
   npm run dev
   ```

   **Production:**
   ```bash
   cd deploy/terraform
   terraform apply
   ```

4. Verify the application is running by logging in with test credentials (local) or checking the health endpoint (production).

**What can go wrong:**

- **All users get logged out**: This is expected. The old JWT tokens are signed with the old secret and will be rejected. Users need to log in again.
- **"UNAUTHORIZED: No token provided" errors after rotation**: This is normal for any requests using old tokens. Clear the browser's local storage and log in again.

---

## 10. Rotate the Database Password

**When to use this:** The database password has been compromised, or it is time for a routine rotation.

**Prerequisites:** Access to the database server and the application's environment configuration.

**Steps:**

1. **Local (Docker):**

   a. Stop the application:
   ```bash
   docker compose down
   ```

   b. Update the `POSTGRES_PASSWORD` in `docker-compose.yml` and the `DATABASE_URL` in `.env` to use the new password.

   c. Remove the old database volume (this deletes all data; re-seed afterward):
   ```bash
   docker compose down -v
   docker compose up -d postgres redis
   npx prisma migrate dev --name init
   npm run db:seed
   ```

2. **Production (AWS RDS):**

   a. Change the database password in the AWS RDS console: navigate to **RDS > Databases > code-for-connection-production-db > Modify**, update the password field, and choose "Apply immediately."

   Alternatively, use the AWS CLI:
   ```bash
   aws rds modify-db-instance \
     --db-instance-identifier code-for-connection-production-db \
     --new-db-password "new-secure-password" \
     --apply-immediately
   ```
   (If `--new-db-password` is not recognized by your CLI version, check `aws rds modify-db-instance help` for the correct flag name.)

   b. Update `db_password` in `deploy/terraform/terraform.tfvars`.

   c. Redeploy the application so it uses the new password:
   ```bash
   cd deploy/terraform
   terraform apply
   ```

**What can go wrong:**

- **"Connection refused" or "authentication failed"**: The application is still using the old password. Double-check that `DATABASE_URL` (local) or the Terraform variable (production) matches the new password exactly.
- **RDS instance becomes unavailable briefly**: Changing the password on RDS may cause a brief restart. Wait 1-2 minutes and try again.

---

## 11. Rotate Twilio Credentials

**When to use this:** Twilio credentials have been compromised, or you are rotating them as a security practice.

**Prerequisites:** Access to the Twilio console (https://console.twilio.com) and the application's environment configuration.

**Steps:**

1. Log into the Twilio console at https://console.twilio.com.

2. Navigate to **Account > API keys & tokens**.

3. Generate a new Auth Token (or create a new API key, depending on your setup).

4. Update the environment variable:

   **Local:** Edit `.env` and set `TWILIO_AUTH_TOKEN` to the new value.

   **Production:** Update the Twilio auth token in your Terraform variables or secrets manager, then redeploy.

5. Restart the API gateway:

   **Local:**
   ```bash
   # Stop and restart the dev servers (Ctrl+C if running, then:)
   npm run dev
   ```

   **Production:**
   ```bash
   cd deploy/terraform
   terraform apply
   ```

6. Test by initiating a voice call and verifying it connects.

**What can go wrong:**

- **Voice calls fail immediately after rotation**: The application is still using the old token. Verify the new token is in the environment variables and that the API gateway was restarted.
- **"Authentication error" in Twilio logs**: The new token was not copied correctly. Go back to the Twilio console and copy it again, making sure there are no extra spaces.

---

## 12. Back Up the Database

**When to use this:** Before a major deployment, database migration, or on a regular schedule.

**Prerequisites:** `pg_dump` installed (comes with PostgreSQL), or AWS console access for RDS.

### Local

**Steps:**

1. Run the database backup:
   ```bash
   pg_dump -U openconnect -h localhost -d openconnect > backup-$(date +%Y%m%d).sql
   ```

2. Verify the backup file is not empty:
   ```bash
   ls -lh backup-*.sql
   ```
   The file should be at least a few kilobytes.

### AWS RDS

**Steps:**

1. Create a manual snapshot via the AWS CLI:
   ```bash
   aws rds create-db-snapshot --db-instance-identifier code-for-connection-production-db --db-snapshot-identifier manual-backup-$(date +%Y%m%d)
   ```

2. Verify the snapshot is being created:
   ```bash
   aws rds describe-db-snapshots --db-snapshot-identifier manual-backup-$(date +%Y%m%d) --query "DBSnapshots[0].Status"
   ```
   Wait until the status shows `"available"`.

**What can go wrong:**

- **"connection refused" on pg_dump**: PostgreSQL is not running. Start it with `docker compose up -d postgres`.
- **RDS snapshot fails**: Check that you have not exceeded the snapshot limit (100 manual snapshots per region). Delete old snapshots if needed.

---

## 13. Restore the Database from Backup

**When to use this:** Data was corrupted or lost and you need to restore from a backup.

**Prerequisites:** A valid backup file (local) or RDS snapshot (production).

### Local

**Steps:**

1. Stop the application (Ctrl+C on the dev server).

2. Drop and recreate the database:
   ```bash
   docker compose exec postgres psql -U openconnect -c "DROP DATABASE IF EXISTS openconnect;"
   docker compose exec postgres psql -U openconnect -c "CREATE DATABASE openconnect;"
   ```

3. Restore from the backup file:
   ```bash
   psql -U openconnect -h localhost -d openconnect < backup-YYYYMMDD.sql
   ```
   Replace `YYYYMMDD` with the date of the backup you want to restore.

4. Restart the application:
   ```bash
   npm run dev
   ```

5. Verify the application works and data is present.

### AWS RDS

**Steps:**

1. Restore from the snapshot (this creates a new RDS instance):
   ```bash
   aws rds restore-db-instance-from-db-snapshot --db-instance-identifier code-for-connection-production-db-restored --db-snapshot-identifier manual-backup-YYYYMMDD
   ```

2. Wait for the new instance to become available:
   ```bash
   aws rds describe-db-instances --db-instance-identifier code-for-connection-production-db-restored --query "DBInstances[0].DBInstanceStatus"
   ```

3. Update your application's `DATABASE_URL` to point to the new RDS endpoint, then redeploy.

4. Once verified, you can rename or delete the old instance.

**What can go wrong:**

- **"database is being accessed by other users"**: The application is still connected. Stop the application first, then retry the drop/restore.
- **Restored RDS instance has different endpoint**: After restoring from a snapshot, the new instance gets a new hostname. Update `DATABASE_URL` in your Terraform variables and redeploy.

---

## 14. Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `EADDRINUSE :::3000` | Another process is already using port 3000 | Find it: `lsof -i :3000` then stop it: `kill <PID>` |
| `EADDRINUSE :::5173` | Another process is already using port 5173 | Find it: `lsof -i :5173` then stop it: `kill <PID>` |
| `UNAUTHORIZED: No token provided` | The request is missing the Authorization header | Check that the frontend sends the `Authorization: Bearer <token>` header with every API request |
| `FORBIDDEN: Insufficient permissions` | The logged-in user does not have the required role | Look up the user in the AdminUser table and verify their `role` field is correct for the action they are trying to perform |
| `Connection refused to localhost:5432` | PostgreSQL is not running | Start it: `docker compose up -d postgres` |
| `Connection refused to localhost:6379` | Redis is not running | Start it: `docker compose up -d redis` |
| `P2002 Unique constraint failed` | You are trying to create a record that already exists (duplicate email, duplicate contact pair, etc.) | Query the table for the existing record before creating a new one. Use Prisma Studio to inspect the data. |
| `P2003 Foreign key constraint failed` | A referenced record does not exist (e.g., creating a facility with a nonexistent agency ID) | Verify that the referenced ID exists in the parent table |
| `ECONNREFUSED 127.0.0.1:3001` | The signaling server is not running | Start it: `docker compose up -d signaling` |
| `JWT expired` | The user's login session has expired | Log out and log back in. The token lifetime is controlled by `JWT_EXPIRES_IN` in `.env` (default: 24 hours) |
