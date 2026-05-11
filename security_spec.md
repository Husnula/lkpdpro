# Security Specification - LKPD Generator Pro

## Data Invariants
1. A User profile can only be created/updated by the authenticated user matching the document ID or an Admin.
2. Users cannot change their own `role` or `status`.
3. An Admin can list and update any user's `status`.
4. `lastLogin` on User is updated on every login.
5. An LKPD document must belong to a valid user.
6. An LKPD document can only be read/updated/deleted by its owner.
7. `createdAt` on LKPD is immutable and must be server-time.

## The "Dirty Dozen" Payloads (Red Team)
1. **Identity Spoofing**: Attempt to update `/users/attackerId` with `uid: "victimId"`.
2. **Profile Hijacking**: Attempt to update `/users/victimId` as `attackerId`.
3. **Ghost Field Injection**: Attempt to add `isAdmin: true` to a user profile.
4. **Data Orphanage**: Attempt to create an LKPD with `userId: "nonExistentUser"`.
5. **Unauthorized Access**: Attempt to read `/lkpds/victimLkpdId` as another user.
6. **Cross-User Update**: Attempt to update another user's LKPD.
7. **Timestamp Mutation**: Attempt to set `createdAt` back to 2020.
8. **Owner Mutation**: Attempt to change `userId` of an existing LKPD.
9. **Junk ID Poisoning**: Attempt to create a document with a 2KB string ID.
10. **Blind Query Scraping**: Attempt a blanket `getDocs(collection(db, "users"))`.
11. **Terminal State Bypass**: (If applicable, e.g., locking a "finalized" LKPD).
12. **Unverified Email Access**: Attempt access with an unverified email (if required).

## Firestore Rules Draft
(See `firestore.rules`)
