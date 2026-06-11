import { supabase } from "@/lib/supabase";

export async function GET() {
  return Response.json({
    status: "API Sensor Active"
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { error } = await supabase
      .from("sensor_readings")
      .insert([body]);

    if (error) {
      console.error(error);

      return Response.json(
        {
          success: false,
          error: error.message
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true
    });

  } catch (err) {
    return Response.json(
      {
        success: false
      },
      { status: 500 }
    );
  }
}