# Hiding Kwanza Plan

The objective is to hide the "Kwanza" plan from the entire platform as per user request.

- [x] Planning and Analysis [x]
    - [x] Search for all occurrences of "Kwanza" or related plan identifiers
    - [x] Create implementation plan
- [x] UI Removal [x]
    - [x] Remove Kwanza plan from `src/components/landing/Plans.tsx`
    - [x] Remove Kwanza plan options from `src/components/dashboard/client/CreateCampaign.tsx`
    - [x] Remove/Update `KWANZA_PLANS` constant or references in `CreateCampaign.tsx`
    - [x] Remove mention of Kwanza from `src/components/Chatbot.tsx`
- [x] Logic Cleanup [x]
    - [x] Check if `src/components/dashboard/worker/TasksList.tsx` needs modification for existing tasks
    - [x] Update WhatsApp confirmation message in `ClientCampaigns.tsx`
- [x] Verification [x]
    - [x] Verify landing page doesn't show Kwanza plan
    - [x] Verify client dashboard doesn't show Kwanza plan options
    - [x] Verify chatbot doesn't mention Kwanza plan

- [x] Add Developer Logo [x]
    - [x] Copy logo to public folder
    - [x] Update `Footer.tsx` to include ByteKwanza logo and attribution
    - [x] Update `AdminSidebar.tsx` or other relevant places if necessary

- [x] Update Task Payment Rules [x]
    - [x] Research existing reward logic
    - [x] Create implementation plan for payment rules
    - [x] Update `LIMAO_PLANS` constants and `reward` logic in `CreateCampaign.tsx`
    - [x] Update worker-side reward displays in `TasksList.tsx`
    - [x] Create manual database migration script
    - [x] Verify new payment calculations in the UI

- [x] Definitive Referral & Schema Fix [x]
    - [x] Perform comprehensive database audit
    - [x] Create consolidated repair script `FIX_DEFINITIVE_SCHEMA_V3.sql`
    - [x] Apply definitive migration to Supabase
    - [x] Verify `profiles` schema and RPC functions
    - [x] Test registration flow with referrals

- [x] Fix Access Metrics Tracking [x]
    - [x] Research tracking logic and missing columns
    - [x] Fix user access metrics tracking (`access_count`, `last_access`)
    - [x] Identify root cause of metrics not updating
    - [x] Implement SQL fix for missing columns and RPC
    - [x] Update Dashboard to track access correctly

- [x] Refactor worker task flow for better UX [x]
    - [x] Research current task flow implementation
    - [x] Create implementation plan for refinement
    - [x] Merge "Reserve" and "Start" steps
    - [x] Implement auto-open for task links
    - [x] Create multi-step submission dialog with conditional visibility
    - [x] Integrate `YouTubeTaskPlayer` with new flow
    - [x] Verify UI consistency and state management

- [x] Fix Campaign Activation Error (V3 Cleanup) [x]
    - [x] Identify root cause: project mismatch in `.env`
    - [x] Resolve SQL dependency errors (Views) for manual fix
    - [x] Identify and revert accidental changes in `pstzibmplwiatkuanhhn`
    - [x] Verify manual fix successful on original project
    - [x] Final cleanup of dev artifacts

- [x] Update withdrawal limit to 500 Kz [x]
    - [x] Change `MIN_WITHDRAWAL` constant in `WithdrawalRequest.tsx`
    - [x] Enhance UI messages for explicit limit display
    - [x] Promote 500 Kz limit on landing page (Hero & HowItWorks)
    - [x] Add worker testimonials section to built credibility

- [/] Implement Light/Dark Mode Support [/]
    - [x] Define light mode variables in `index.css`
    - [/] Update components to use theme-aware colors
    - [ ] Verify readability in both modes
