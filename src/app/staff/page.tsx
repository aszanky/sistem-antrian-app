import { redirect } from "next/navigation";
import { loadStaffConsole } from "@/lib/console-service";
import { currentSessionToken } from "@/lib/session";
import { StaffConsole } from "./StaffConsole";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const token = await currentSessionToken();
  if (!token) redirect("/staff/login");

  const state = await loadStaffConsole(token);
  if (!state) redirect("/staff/login");

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <StaffConsole
        businessName={state.businessName}
        staffEmail={state.email}
        initialState={state}
      />
    </main>
  );
}
