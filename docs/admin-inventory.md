# Administrative Inventory

## Django Admin

**Tokens**
Not something I look at.

**Groups**
**Users**
Replaced by the new admin (Player Management).

**Page contents**
Content is still edited here. Adding new records is coordinated with public website changes, which references content by key.

**Tags**
**Aces**
**Board members**
CRUD managed here.

**Low scores**
**Major champions**
Now calculated in the new admin from results. Only use django admin to fix issues.

**Courses**
**Tees**
Created here, but now managed primarily by the golf genius integration in the new admin.

**Dam cup**
CRUD managed here.

**Season Long Points**
Obsolete - replaced by Tournament Points.

**Club Document Codes**
**Club Documents**
Similar to page contents in that there must be coordination with code. Club documents now uploaded and edited in the new admin.

**Documents**
**Photos**
Handled primarily in the new admin in event-related administration.

**Event pairings**
**Event sessions**
**Rounds**
**Tournament points**
**Tournament results**
**Tournaments**
Managed in the new admin. Screens here used for troubleshooting, but not very user friendly.

**Fee types**
CRUD managed here.

**Events**
Edits are managed here. Creating new events is a pain. We have a Copy Event in the new admin to make it somewhat easier. The logic to copy/clone events is in Django. Definitely want to make setting up a season full of events easier. Creating registration slots to support player sign-up is a related but separate step. There are a lot of settings for an event.

**Announcements**
Replaced by the new admin. No longer used.

**Contact messages**
Only occasionally look at this - saved contact us messages.

**Payments**
The payment report in the new admin is better for troubleshooting.

**Policies**
CRUD managed here.

**Players**
Replaced by the new admin. No longer used.

**Registration slots**
**Registrations**
Last resort CRUD to troubleshoot registration issues. Painful.

**Event Scorecards**
Rarely look at this. Data is imported from golf genius.

**Sites**
Django concept only.

## Nextjs Admin

### Club Administration

**Membership Report**
**Manage Club Documents**
**Upload Photos**
**Announcements**
**Player Management**
No real problems with new admin. Will probably just get re-skinned

**Settings**
Not implemented

### Event Administration

All event-centric. Pick an event first, then work on that event.

**Player Management**
The workflows here all make sense. UX can be improved. Code is a mess.

**Event Reporting**
Reports are all useful. Need to validate finance report - treasurer doesn't believe it's accurate enough.

**Event Status**
Tries to answer the question, "Is the event configured fully/correctly?" Not all that useful as it is now. It would be nice to be alerted before registration starts if something looks wrong in event configuration (missing registration slots, dates that don't look right, etc.)

**Payout Status**
Two functions for two different people:

1. Pro shop liaison reviews payouts and tells the system if they've been posted in their system.
2. Treasurer reviews skins and tells the system if the cash has been put into envelopes and delivered to the pro shop (where players can pick them up.)

Neither has sufficient guards.

**Copy Event**
Awkward that I have to go in here to clone events for a new season. This will be reworked into a single season setup screen or import from a file.

**Session Configuration**
Applies only to weekend major events that need additional information from players when they register.

**Golf Genius Integration**
**Event Documents**
These need rework. Processes can be streamlined. An agent could help, I think.

Before each event (tournament) is played, when registration closes.

1. I create an event in Golf Genius by cloning a template I created (no API support).
2. Run the Sync Event job, then the Export Roster job.
3. Complete the event setup in Golf Genius (manual - can't be automated).
4. Export files from Golf Genius (tee sheet, flight documents).
5. Run the Import Teesheet job so the quick link to mobile scoring is available to players.
6. Post the tee sheet and flights using the Event Documents function.

1-6 need to be done between close of registration and before the event is played. If there are changes (player drops, player is added, etc.), these need to be managed in our system and we repeat the Export Roster job as needed. Then the changes have to be made in GG as well.

After the event finishes, I do the following:

1. Complete the event in Golf Genius (no API that I know of - research to see if that has changed). This calculates all results, points, and payouts in GG.
2. Run the Import Scores job (for most weeknight 9-hole events, excluding scrambles/shambles).
3. Run the Import Points job (excluding events with no points awarded).
4. Run the Import Results job (all events).

We give players about 24 challenge the results in case there has been an error or dispute of some kind. If a result is changed, the change is made in GG and we rerun the jobs above. To close out the event:

1. Run the Import Low Scores job (weeknight 9-hole events, excluding scrambles/shambles).
2. Run the Import Champions job.
3. Run Close Event job.
4. Run the Results Report in this admin.
5. Rework the formatting (would like to improve the report to avoid this, but it's complex).
6. Save as a PDF.
7. Upload the PDF using the Event Documents function.
