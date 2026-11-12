import Info from "@/components/screens/Info";
import Faq from "@/components/screens/Faq";
import Hero from "@/components/screens/Hero";
import { isAuthEnabled } from "@/config/auth";

export const revalidate = 60;

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { test_auth?: string };
}) {
  const authEnabled =
    searchParams?.test_auth === "true" || (await isAuthEnabled());

  return (
    <div>
      <Hero authEnabled={authEnabled} />
      <Info authEnabled={authEnabled} />
      <Faq />
      {/* Happy Birthday Abhi broski, Hope you have an amazing year!!! Love you lots*/}
    </div>
  );
}
