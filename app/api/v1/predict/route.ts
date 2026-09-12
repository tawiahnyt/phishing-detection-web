import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body || typeof body.url !== "string") {
      return NextResponse.json(
        { error: "URL field is required and must be a string." },
        { status: 400 }
      )
    }

    const backendEndpoint = `${BACKEND_URL.replace(/\/$/, "")}/api/v1/predict`

    const response = await fetch(backendEndpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: body.url }),
    })

    const responseData = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        responseData || { error: `Backend returned status ${response.status}` },
        { status: response.status }
      )
    }

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error("Error proxying to backend /api/v1/predict:", error)
    return NextResponse.json(
      {
        error: `Could not connect to backend prediction service at ${BACKEND_URL}. Please verify that the backend server is running.`,
        detail: error?.message,
      },
      { status: 502 }
    )
  }
}
