# Security Specification - G4 Emerging LEADER

## Data Invariants
- A simulation record must belong to the authenticated user who created it (`userId == request.auth.uid`).
- Simulation records are immutable by users after creation; only admins can modify or delete them.
- Personas and Scenarios can only be modified by admins.
- All users must be authenticated to read personas or scenarios.

## The "Dirty Dozen" Payloads (Simulation Injection)
Attempt to break Identity, Integrity, and State:

1. **Identity Spoofing**: `userId` set to another user's UID.
2. **Ghost Field**: Adding `isVerified: true` to a simulation.
3. **Privilege Escalation**: Attempting to write to `personas` as a non-admin.
4. **ID Poisoning**: Creating a simulation with a 1MB string as `personaId`.
5. **Orphaned Write**: Creating a simulation with a non-existent `scenarioId` (Though we don't have hard relational checks yet, type/size checks are in place).
6. **Clock Skew**: Sending a future `timestamp`.
7. **Size Attack**: Sending a 1MB string in a persona's `name`.
8. **Enum Violation**: Setting `division` to '부서' instead of '영업' or '서비스'.
9. **Missing Keys**: Creating a persona without the `style` field.
10. **Admin Cloaking**: Modifying a simulation's `userId` after creation (Update block restricted to Admin).
11. **PII Leak**: A user attempting to `list` all simulations (Rule restricts to owner or admin).
12. **Shadow Update**: Adding `isAdmin: true` to the persona payload.
