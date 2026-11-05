# Backend: escrow payments (Supabase)

The AuthentiTrade payment runs on Supabase. All the rules live in the database,
so a buyer cannot fake a payment from the browser.

## One-time setup (about 2 minutes)

1. Open your project at supabase.com → **SQL Editor** → **New query**.
2. Paste the whole of `payments.sql` and press **Run**. It is safe to run again later.
3. Make sure your own account is an admin (you already have an `admins` table):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com'
   on conflict do nothing;
   ```
4. Restart the frontend (`npm install` the first time, then `npm run dev`).

If your `listings.listing_status` column only allows certain values, also allow `'sold'`
so paid items disappear from the marketplace. Payments still work without this,
and a second buyer still cannot pay for an item that has already been paid for.

## How a payment works

| Step | Who | What happens | Status |
|---|---|---|---|
| 1 | Buyer | Opens a verified listing → **Pay online with escrow** → checkout | – |
| 2 | Buyer | Pays by card (any test card + any 6-digit OTP) or scans the UPI QR with a phone (any 4-digit PIN) | `held` |
| 3 | System | Listing is marked sold; the seller gets a **Payment received** pop-up and a badge on **Orders** | `held` |
| 4 | Buyer | **I received it, release payment** → money goes to the seller | `released` |
| 4b | Buyer | **Report a problem** → money stays held for a moderator | `disputed` |
| 5 | Admin | **Admin → Payments**: release to the seller or refund the buyer (a refund puts the listing back on sale) | `released` / `refunded` |
| auto | System | If the buyer does nothing for 7 days, the money is released automatically | `released` |

## Rules the database enforces

- You must be logged in. You cannot buy your own listing. Only verified, active listings can be bought.
- Items above `contact_only_above` (₹2,00,000) cannot be paid for online.
- Each listing can be paid for only once.
- Buyers and sellers see only their own orders. Admins see everything, including buyer and seller emails.
- Nobody can edit the `transactions` table directly. Every change goes through the functions.
- Card numbers are never sent or stored, only a label such as `VISA •••• 4242`.

Change the limits in the `app_settings` table: `online_only_below`, `contact_only_above`,
`escrow_days` and `qr_minutes`.

## Database functions

| Function | Used by |
|---|---|
| `create_order`, `pay_order`, `order_preview`, `pay_order_by_token` | Checkout (card and UPI QR) |
| `release_order`, `dispute_order`, `release_due` | Buyer's Orders screen |
| `my_orders`, `unseen_sales`, `mark_sales_seen` | Orders screen (Purchases and Sales), seller notification |
| `admin_payments`, `admin_resolve_order` | Admin → Payments and Admin → Disputes |

## Test mode

No real money moves. To take real payments later, swap the simulated card/UPI step
for a gateway such as Razorpay (test keys first), using a Supabase Edge Function
that checks the gateway's payment signature before calling `_at_mark_paid`.
