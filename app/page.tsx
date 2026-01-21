'use client';

import Image from "next/image";
import { Card, CardHeader, CardFooter } from "@fluentui/react-components";
import { Button as FluentButton, Text, Link } from "@fluentui/react-components";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <Card style={{ width: 480, padding: 32 }}>
        <CardHeader
          header={
            <Text size={700} weight="semibold">
              Welcome to DocuManagementEM
            </Text>
          }
          description={
            <Text size={400}>To get started, edit the page.tsx file.</Text>
          }
        />
        <div style={{ margin: "32px 0", textAlign: "center" }}>
          <Text size={400}>
            Looking for a starting point or more instructions?
          </Text>
          <div style={{ marginTop: 16 }}>
            <FluentButton appearance="primary">Fluent UI 버튼 예시</FluentButton>
          </div>
        </div>
        <CardFooter>
          <div style={{ display: "flex", gap: 16 }}>
            <Link
              href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
            >
              <FluentButton appearance="primary">Deploy Now</FluentButton>
            </Link>
            <Link
              href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
            >
              <FluentButton appearance="outline">Documentation</FluentButton>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
