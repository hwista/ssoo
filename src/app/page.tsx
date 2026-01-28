'use client';

import Image from "next/image";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <Card className="w-[480px] p-8">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            Welcome to DocuManagementEM
          </CardTitle>
          <CardDescription>
            To get started, edit the page.tsx file.
          </CardDescription>
        </CardHeader>
        <div className="my-8 text-center">
          <p className="text-sm text-muted-foreground">
            Looking for a starting point or more instructions?
          </p>
          <div className="mt-4">
            <Button>Tailwind UI 버튼 예시</Button>
          </div>
        </div>
        <CardFooter>
          <div className="flex gap-4">
            <Link
              href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
            >
              <Button>Deploy Now</Button>
            </Link>
            <Link
              href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
            >
              <Button variant="outline">Documentation</Button>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
