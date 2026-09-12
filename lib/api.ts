export interface PredictRequest {
  url: string
}

export interface PredictResponse {
  url_prediction: boolean
  url_confidence: number
  url: string
}

export interface FeedbackRequest {
  timestamp: string
  url: string
  detection_result: string
  user_label: string
  comments: string
}

export interface FeedbackResponse {
  status?: string
  message?: string
  detail?: string | any
  [key: string]: any
}

// Default to relative /api/v1 (proxied through Next.js route handler to bypass CORS)
// or use NEXT_PUBLIC_API_URL if specified.
const API_BASE_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api/v1` : '/api/v1')
  : (process.env.BACKEND_API_URL ? `${process.env.BACKEND_API_URL.replace(/\/$/, '')}/api/v1` : 'http://127.0.0.1:8000/api/v1')

/**
 * Calls POST /api/v1/predict
 */
export async function predictUrl(url: string): Promise<PredictResponse> {
  const endpoint = '/api/v1/predict'

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`
    try {
      const errJson = await response.json()
      if (errJson?.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail)
      } else if (errJson?.error) {
        errorDetail = errJson.error
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail)
  }

  const data = await response.json()
  return data as PredictResponse
}

/**
 * Calls POST /api/v1/feedback
 */
export async function submitFeedback(payload: FeedbackRequest): Promise<FeedbackResponse> {
  const endpoint = '/api/v1/feedback'

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let errorDetail = `Feedback submission failed with status ${response.status}`
    try {
      const errJson = await response.json()
      if (errJson?.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail)
      } else if (errJson?.error) {
        errorDetail = errJson.error
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail)
  }

  try {
    const data = await response.json()
    return data as FeedbackResponse
  } catch {
    return { status: 'success' }
  }
}
