# SubnetOps v104

## Main additions
- Site records now support an optional street address in addition to the location label.
- The Sites workspace form/table/search were updated to include site address details.
- Requirements now include explicit site identity capture guidance and a device naming convention selector.
- The synthesis engine now generates device names using the selected naming convention, with support for short-code, readable, and location-role-index styles.
- Report wording now surfaces site identity and device naming choices more clearly.

## Important note
- Prisma schema was updated for the new optional `streetAddress` field, so a migration will still be needed in the real project environment before using this field end to end.
