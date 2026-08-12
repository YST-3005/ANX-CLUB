"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfileEditPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/profile");
  }, [router]);
  return null;
}
