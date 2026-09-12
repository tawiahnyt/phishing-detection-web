import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || ""
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const backendEndpoint = `${BACKEND_URL.replace(/\/$/, "")}/api/v1/feedback`

    const payload = {
      timestamp: body.timestamp || new Date().toISOString(),
      url: body.url || "",
      detection_result: body.detection_result || "",
      user_label: body.user_label || "",
      comments: body.comments || "",
    }

    const response = await fetch(backendEndpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const responseData = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        responseData || { error: `Backend returned status ${response.status}` },
        { status: response.status }
      )
    }

    return NextResponse.json(responseData || { status: "success" })
  } catch (error: any) {
    console.error("Error proxying to backend /api/v1/feedback:", error)
    return NextResponse.json(
      {
        error: `Could not connect to backend feedback service at ${BACKEND_URL}. Please verify that the backend server is running.`,
        detail: error?.message,
      },
      { status: 502 }
    )
  }
}
