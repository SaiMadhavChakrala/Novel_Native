import { auth } from "../auth"; // Adjust path if needed
import NavbarUI from "./NavbarUI"; // We will create this next
import SessionExpiryWatcher from "./SessionExpiryWatcher";

// This remains a Server Component to fetch data
export default async function Navbar() {
  const session = await auth();

  return (
    <>
      <SessionExpiryWatcher expiresAt={session?.expires ?? null} />
      <NavbarUI userName={session?.user?.name ?? null} />
    </>
  );
}
