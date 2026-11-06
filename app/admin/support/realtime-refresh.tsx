"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
export default function SupportRealtimeRefresh(){const router=useRouter();useEffect(()=>{const sb=createClient();const channel=sb.channel("admin-support-inbox").on("postgres_changes",{event:"INSERT",schema:"public",table:"support_messages"},()=>router.refresh()).on("postgres_changes",{event:"UPDATE",schema:"public",table:"support_conversations"},()=>router.refresh()).subscribe();return()=>{void sb.removeChannel(channel)};},[router]);return null;}
