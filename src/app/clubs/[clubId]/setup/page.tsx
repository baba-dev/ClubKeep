import { redirect } from "next/navigation";
export default async function SetupHome({params}:{params:Promise<{clubId:string}>}){
  const {clubId}=await params;
  redirect("/clubs/"+encodeURIComponent(clubId)+"/setup/type");
}
