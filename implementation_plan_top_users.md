# Add Top 10 Users Section to Homepage

We need to display the top 10 users on the homepage based on their total points.

## User Requirements
- Fetch data from `top_users` collection.
- Display top 10 users.
- Use a "beautiful way" (Leaderboard style).

## Proposed Changes

### API Layer
#### [MODIFY] [api.ts](file:///c:/Users/choudhury/Documents/jm-coupon/apis/api.ts)
- Add `fetchTopUsers` function.
- Use `pb.collection('top_users').getList(1, 10, { sort: '-total_points' })`.
- Return the list of users.

### Components
#### [CREATE] [TopUsers.tsx](file:///c:/Users/choudhury/Documents/jm-coupon/app/components/TopUsers.tsx)
- Create a new component `TopUsers`.
- Use `useQuery` to fetch data using `fetchTopUsers`.
- Render a leaderboard or card list.
- Use Tailwind CSS for styling (glassmorphism, gradients).
- Display rank, name, and total points.
- Handle loading (skeleton) and error states.

### Homepage
#### [MODIFY] [page.tsx](file:///c:/Users/choudhury/Documents/jm-coupon/app/page.tsx)
- Import `TopUsers` component.
- Add it to the main layout, likely below the hero section or in a dedicated section.

## Verification Plan
1.  **Start App**: `npm run dev`.
2.  **Check Homepage**: Verify the "Top Users" section appears.
3.  **Verify Data**: Ensure the data matches the API response (mock or real).
4.  **Check Styling**: Ensure it looks "premium" and "beautiful".
