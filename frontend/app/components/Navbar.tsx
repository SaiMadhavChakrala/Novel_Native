import { auth } from "../auth"; // Adjust path if needed
import NavbarUI from "./NavbarUI"; // We will create this next

// This remains a Server Component to fetch data
export default async function Navbar() {
  const session = await auth();

  return <NavbarUI userName={session?.user?.name ?? null} />;
}
