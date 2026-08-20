# Presentation walkthrough — Health and Wellness Management System

Keep this open on a second screen. It assumes you are presenting the working system and asking for a deployment for user testing.

---

## 1. Before the meeting

**Do this the day before, not on the day.** The setup below takes about fifteen minutes and cannot be rushed in front of an audience.

### 1.1 Bring the system up

```bash
cd "/home/akanga-andrew/Desktop/Internship/Medic Dashboard/hwms" && make up
```

Wait for Keycloak. Then confirm everything answers:

```bash
cd "/home/akanga-andrew/Desktop/Internship/Medic Dashboard/hwms" && make smoke
```

Expect 7 passed, 0 failed. If anything fails, do not proceed to the demo until it is fixed.

### 1.2 Create the officer account

**Without this you cannot show anything clinical.** Only the manager account exists.

Sign in at http://localhost:8090 as the manager, open **Accounts**, and create an account with the **Health and Wellness Officer** role. Use a name that is obviously synthetic. Note the temporary password — you will need it during the demo, and the account will demand a change at first sign-in, so **sign in as the officer once now** to get that out of the way.

Create a **Director** account too. You will want it for the access-separation moment.

### 1.3 Put some history in

An empty patient record proves nothing. Signed in as the officer, create **three patients** and give one of them **two visits** on different dates, with a laboratory requisition against the earlier one, results recorded, and the visit signed.

That gives you a patient whose record actually tells a story. Leave a second patient with a **draft** visit and a requisition **without results**, so the "needs attention" band has something in it. That contrast is worth more than a tidy screen.

Do not reset the demo data after this. It will not recreate itself.

### 1.4 Have these ready

- Browser at http://localhost:8090, signed out, zoomed to about 110 per cent
- The printed **KMC.DQHSE.05/26-FM008** laboratory form on the table
- The four documents, printed or on screen
- A second browser profile or private window, so you can hold two roles signed in at once without logging out mid-demo

---

## 2. Know which system you are showing

You have two things, and blurring them is the fastest way to lose credibility.

| Show in the **built system** | Show in the **prototype** |
|---|---|
| Sign-in, roles, account administration | Referrals and the referral PDF |
| Patient registry and search | The divisional indicators with figures in them |
| Clinic visits, section states, signing | Monthly returns |
| Laboratory requisition, results, form PDF | Ergonomics and industrial hygiene |
| The consolidated patient record | |

**Say which one you are in, each time you switch.** The sentence to use is: *"This next part is the working system"* or *"This part is still the prototype, so it is showing the workflow rather than running it."*

If you are asked whether something is built and you are not certain, say you will confirm rather than guess. One wrong claim costs more than one unanswered question.

---

## 3. The story to tell

Three sentences, and everything else hangs off them:

> The Division asked for a dashboard people type figures into at the end of the day. That is a second manual process alongside the paper one, and it inherits every weakness of the paper. So the system records the work where it happens, and the dashboard is calculated from those records.

Come back to that whenever a question drifts. It is the argument for the whole design.

---

## 4. The walkthrough

Twenty-five minutes at a comfortable pace. Section 4.7 is the ask, and you should not run out of time before reaching it.

### 4.1 Start with the problem, not the software (2 min)

Do not open the laptop yet. Hold up the paper form.

Say what happens now: the form is filled in, filed, and nobody can answer how many people attended last month without counting paper. Say that the Division asked for a dashboard, and that the dashboard alone would have meant entering the same information twice.

### 4.2 Sign in as the manager (3 min)

Open http://localhost:8090.

Point out that the sign-in page has **no password field of its own**. It hands over to the corporate sign-in service. Say why: the application never sees a password, and when KMC is ready for single sign-on, that is a configuration change rather than a rebuild.

Sign in. You land on the dashboard.

**Every indicator reads "No data".** Say this deliberately, before anyone asks:

> This is not broken. Nothing has been recorded yet, so the system will not show a number. A dashboard that prints zero when it means "I do not know" is the exact problem we were asked to remove.

That one line does more work than any feature you can show.

### 4.3 The manager cannot see clinical records (3 min)

This is the moment that matters most. Do it slowly.

Look at the left-hand navigation. There is no Patients, no Visits, no Laboratory. Say that items are hidden rather than greyed out, because a greyed-out control invites a conversation about being allowed to use it.

Then **type the address directly** into the browser:

```
http://localhost:8090/patients
```

You get a page explaining that this is not part of your role, naming the manager as the person who assigns roles. Say:

> Hiding the menu is a courtesy. This is the control. The refusal happens in the service, not in the screen, and there is an automated test that tries every clinical address as every non-clinical role on every build.

If the room includes IT, this is the point to say there are four independent layers enforcing it, and that the clinical database is a separate instance whose credentials no other service holds.

### 4.4 Accounts, and the audit trail (2 min)

Open **Accounts**. Show the officer and director accounts.

Point out that the manager creates officers and directors but **cannot create another manager**. Say that every creation is written to the audit log against the manager's name — because the manager can create the account that holds the only clinical role in the system, and the record of having done it is what makes that acceptable.

### 4.5 Sign in as the officer (8 min)

Switch to the second browser window. Sign in as the officer.

Note where you land: **Patient visits, not the dashboard.** Someone opening this to record a visit should not have to walk past a performance summary.

Then, in order:

**Register a patient.** Point out that only name, age, sex and category are required, and that the staff number is optional for every category. Say why: a registry that demanded a staff number would force staff either to turn someone away or to invent a number under pressure.

**Record a visit.** Show the visit types. Show the vital signs. Enter a deliberately abnormal value, such as a temperature of 41, and show that it **warns and still records**. Say: *"An abnormal reading is exactly the reading that matters. A system that refuses to record it is worse than paper."*

**Open the visit and work through the sections.** Show the four states, and dwell on **"Not clinically indicated"**. This is the one to explain properly:

> On paper, a blank section could mean the officer decided it did not apply, or it could mean they forgot. Those are completely different things, and paper cannot tell them apart. The system records which one it was.

**Sign the visit.** Show that it locks and cannot be edited. Say that a correction is added as an amendment that keeps the original, and be honest that the amendment screen is not built yet.

### 4.6 Laboratory, and the form (4 min)

From the visit, choose **Request laboratory**.

Hold up the paper form beside the screen. The seven investigations, in four groups, in the same order. Say that an earlier draft carried a generic panel with liver function and lipids and audiometry, and that all of it was removed when the real form arrived, because none of it is what the clinic actually offers.

Point at the **fasting note** against FBS and say it is a patient instruction, not a footnote, so it appears wherever that test appears.

Record a result. Then **download the form**. Open the PDF next to the paper form.

That side-by-side is the strongest visual moment you have. Let it sit for a second before you speak.

Say plainly that the system records the result exactly as the laboratory wrote it and **does not decide whether it is abnormal**, because the form defines no reference ranges and inventing one would put a clinical judgement into software. Ask whether the laboratory wants structured ranges — this is a genuine open question and asking it in the room is better than deciding it alone.

### 4.7 The patient record (3 min)

Open **Patients**, then **Open record** on the patient with two visits.

Walk down the page in order: who this is, what needs attention, how much history, then the history itself.

Point out that the laboratory requisition sits **inside** the visit it was raised from. Say:

> Before this, you would have opened the visit list, filtered it, then opened the laboratory list, filtered that, and joined them in your head. The visit and the test are already related. This just stops throwing that away.

Point at the "needs attention" band and say it only appears when there is something in it, because a banner that permanently says "nothing outstanding" is one people stop reading.

### 4.8 The ask (3 min)

Close the laptop lid or switch away from the screen. This part is a conversation, not a demo.

Say what is built, what is not, and what you are asking for:

> What you have seen runs. What it needs now is people using it, on KMC infrastructure, with invented patients, to find the things a demonstration cannot find. That is what the deployment request asks for. It asks for nothing else. No real patient record goes anywhere near it.

Hand over the four documents. Name what each is for in one line each. Then name the three approvals you need and who gives them.

---

## 5. Questions you will be asked

Short, honest answers. Do not improvise on these.

**"Can I see who has been to the clinic?"**
No. Management sees aggregate figures and nothing that identifies a person. That protects the employee from an employment consequence following a medical disclosure, protects the officer from being pressed to disclose, and protects KMC under the Data Protection Act. If the Division wants that changed, it is a decision for the data protection owner, and it should be a decision rather than something that erodes.

**"When can we start using it for real?"**
Not from this request. Testing uses invented data. Before real records there is a list, and it is in the security review: multi-factor sign-in, tamper evidence on the access log, backups with a tested restore, a retention policy, and a named owner. Most of that is ICT work rather than software work.

**"Who looks after it when your attachment ends?"**
Nobody yet, and that is the single most important thing on the list. The system should not hold clinical records with no named owner. I have written it into the documents as a release blocker rather than a preference.

**"What about Quality, Safety, Environment?"**
Out of scope since 4 August, when it was established those divisions run their own systems. If that changes the structure is there, but I would rather finish one division properly.

**"Why is the near-miss target 200 and not zero?"**
Because more near-miss reports mean people are reporting. It is the one indicator on your own dashboard where a rising number is good, and the card says so, so nobody reads it backwards.

**"Can you add [something]?"**
Almost certainly, but the answer is not yes in the room. Write it into the decision register with an owner. Things added in meetings without an owner are the things that get half-built.

**"Is it secure?"**
The confidentiality design is sound and I can show you the tests. There are four high findings still open, and they are in the review: no transport encryption yet, development credentials still in the repository, no multi-factor, and no tamper evidence on the access log. The first two are ICT tasks and are quick.

**"How long did this take / can we get more?"**
Answer the first honestly and do not commit to the second. Say what the next increment would be, not when.

---

## 6. What not to say

- Do not say "it is finished" or "it is ready". It is ready for user testing with invented data.
- Do not show a prototype screen without saying it is the prototype.
- Do not promise a date for anything you do not control, which includes every ICT item.
- Do not answer a data-protection question with your own opinion. Route it to the data protection owner.
- Do not describe the referral authorisation as solved. It is an open conflict and the documents say so.
- If something breaks, say what broke. Do not narrate around it.

---

## 7. If something goes wrong

**Sign-in fails or loops.** Sign out fully, close the tab, open a fresh private window. If it persists, `make restart`, wait a minute, carry on talking through the paper form while it comes back.

**A page shows an error.** Say "that is a defect, I will note it" and move on. Finding defects is the stated purpose of user testing, so a defect during a demo is embarrassing rather than damaging. Do not debug in the room.

**The stack is down entirely.** Do not try to fix it live. Switch to the prototype, which needs nothing but a browser, and say clearly that you are showing the workflow rather than the running system. Offer to demonstrate the built system separately.

**Have a fallback.** Take screenshots of the six key screens the day before and keep them in a folder. If the machine fails completely you can still walk through the story.

---

## 8. Timing

| Version | Cut to |
|---|---|
| 25 minutes, full | As written above |
| 10 minutes | Problem, dashboard reading no data, manager refused on a clinical address, laboratory form beside the paper, the ask |
| 5 minutes | Laboratory form beside the paper, manager refused, the ask |

If you have to cut, keep **the refusal** and **the form**. One proves the design decision that matters most, the other proves you built what they actually use.
