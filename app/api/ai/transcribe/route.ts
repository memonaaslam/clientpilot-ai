import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type DemoTask = {
  title: string;
  dueDate: string | null;
};

function createDemoAnalysis(title: string) {
  const transcript =
    "Demo transcript for " +
    title +
    ". The client wants villa renovation in Dubai. Budget is AED 80000. They prefer a modern beige design. The next step is to send a proposal tomorrow and follow up on WhatsApp.";

  const tasks: DemoTask[] = [
    { title: "Prepare villa renovation proposal", dueDate: null },
    { title: "Send proposal to client tomorrow", dueDate: null },
    { title: "Follow up with client on WhatsApp", dueDate: null }
  ];

  const analysis = {
    summary:
      "Client wants a villa renovation in Dubai with a budget of AED 80000. Preferred style is modern beige. The main next step is to prepare and send a proposal tomorrow, then follow up on WhatsApp.",
    whatsappFollowUp:
      "Hi, thank you for today's meeting. As discussed, we will prepare a villa renovation proposal based on your AED 80000 budget and modern beige design preference. We will share the proposal tomorrow.",
    emailFollowUp:
      "Dear Client,\n\nThank you for your time today. As discussed, we will prepare a villa renovation proposal based on your AED 80000 budget and modern beige design preference. We will share the proposal tomorrow.\n\nBest regards,\nClientPilot AI",
    tasks,
    budget: "AED 80000",
    style: "Modern beige",
    location: "Dubai",
    mode: "demo"
  };

  return { transcript, analysis };
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please login first." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const clientId = String(formData.get("clientId") || "");
    const title = String(formData.get("title") || "Client meeting");

    if (!file) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }

    if (!clientId) {
      return NextResponse.json({ error: "Client is required." }, { status: 400 });
    }

    const { transcript, analysis } = createDemoAnalysis(title);

    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .insert({
        user_id: user.id,
        client_id: clientId,
        title,
        audio_path: null,
        transcript,
        summary: analysis.summary,
        follow_up_message: analysis.whatsappFollowUp,
        email_follow_up: analysis.emailFollowUp,
        ai_json: analysis
      })
      .select("id")
      .single();

    if (meetingError) {
      throw meetingError;
    }

    const { error: taskError } = await supabase.from("tasks").insert(
      analysis.tasks.map((task) => ({
        user_id: user.id,
        client_id: clientId,
        meeting_id: meeting.id,
        title: task.title,
        due_date: task.dueDate,
        status: "open"
      }))
    );

    if (taskError) {
      throw taskError;
    }

    return NextResponse.json({
      meetingId: meeting.id,
      transcript,
      analysis,
      demo: true
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong." },
      { status: 500 }
    );
  }
}
