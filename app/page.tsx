"use client"

import { useState } from "react"
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Search,
  ShieldAlert,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Server,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { predictUrl, submitFeedback } from "@/lib/api"

export default function PhishingDetector() {
  const [url, setUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [result, setResult] = useState<null | {
    status: "safe" | "suspicious" | "dangerous"
    reasons: string[]
    score: number
    prediction: boolean
    confidence: number
    analyzedUrl: string
  }>(null)

  // Feedback states
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [submittedFeedbackDetails, setSubmittedFeedbackDetails] = useState<{
    user_label: string
    detection_result: string
    comments?: string
    timestamp: string
  } | null>(null)
  const [comments, setComments] = useState("")
  const [showComments, setShowComments] = useState(false)

  const analyzeUrl = async () => {
    const targetUrl = url.trim()
    if (!targetUrl) return

    setIsAnalyzing(true)
    setResult(null)
    setAnalysisError(null)
    setFeedbackSubmitted(false)
    setFeedbackError(null)
    setSubmittedFeedbackDetails(null)
    setComments("")

    try {
      const data = await predictUrl(targetUrl)

      // Map API response directly
      // Backend format: { "url_prediction": boolean, "url_confidence": number, "url": string }
      const isPhishing = Boolean(data.url_prediction)
      const confidence = typeof data.url_confidence === "number" ? data.url_confidence : parseFloat(data.url_confidence as any) || 0
      const confidencePercent = Math.round(confidence * 100)

      // Rely directly on API prediction: true -> dangerous (phishing), false -> safe (legitimate)
      const status: "safe" | "dangerous" = isPhishing ? "dangerous" : "safe"
      const reasons: string[] = [
        isPhishing
          ? `AI model classified this URL as phishing (${confidencePercent}% confidence)`
          : `AI model classified this URL as legitimate (${confidencePercent}% confidence)`,
      ]

      setResult({
        status,
        reasons,
        score: isPhishing ? confidencePercent : Math.max(0, 100 - confidencePercent),
        prediction: isPhishing,
        confidence,
        analyzedUrl: data.url || targetUrl,
      })
    } catch (error: any) {
      console.error("API Error:", error)
      setAnalysisError(error?.message || "Failed to reach detection API.")
      setResult(null)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getStatusIcon = (status: "safe" | "suspicious" | "dangerous") => {
    switch (status) {
      case "safe":
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case "suspicious":
        return <AlertCircle className="h-6 w-6 text-yellow-500" />
      case "dangerous":
        return <ShieldAlert className="h-6 w-6 text-red-500" />
      default:
        return null
    }
  }

  const handleFeedbackSubmit = async (userLabel: string) => {
    if (!result) return

    setIsSubmittingFeedback(true)
    setFeedbackError(null)

    const timestamp = new Date().toISOString()
    const detectionResult = result.prediction ? "phishing" : "legitimate"
    const payload = {
      timestamp,
      url: result.analyzedUrl,
      detection_result: detectionResult,
      user_label: userLabel,
      comments: comments.trim(),
    }

    try {
      await submitFeedback(payload)
      setSubmittedFeedbackDetails({
        user_label: userLabel,
        detection_result: detectionResult,
        comments: comments.trim(),
        timestamp,
      })
      setFeedbackSubmitted(true)
    } catch (error: any) {
      console.error("Feedback submission error:", error)
      setFeedbackError(
        error?.message || "Failed to submit feedback. Please check if the backend service is reachable."
      )
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  const apiHostDisplay = (process.env.NEXT_PUBLIC_API_URL || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4 min-h-screen flex flex-col items-center justify-center">
      <div className="flex items-center gap-2 mb-2">
        <h1 className="text-3xl font-bold text-center">Phishing Website Detector</h1>
      </div>
      <p className="text-muted-foreground text-center mb-8">
        Check if a website is potentially dangerous or attempting to steal your information
      </p>

      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>URL Analyzer</CardTitle>
              <CardDescription>Enter a website URL to check if it's safe to visit</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs text-muted-foreground flex items-center gap-1">
              <Server className="h-3 w-3" />
              API: {apiHostDisplay}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isAnalyzing && analyzeUrl()}
            />
            <Button onClick={analyzeUrl} disabled={!url.trim() || isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Analyze
                  <Search className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {analysisError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Backend Notice</AlertTitle>
              <AlertDescription className="text-xs">
                {analysisError} (Configured endpoint: <code>{process.env.NEXT_PUBLIC_API_URL}</code>).
              </AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/40 rounded-lg border">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(result.status)}
                  <h3 className="text-xl font-semibold capitalize">{result.status}</h3>
                  <Badge
                    className={`ml-2 ${
                      result.status === "safe"
                        ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                    }`}
                  >
                    {result.status === "safe" ? "Legitimate" : "Phishing"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Model Output:</span>
                  <Badge variant={result.prediction ? "destructive" : "secondary"}>
                    {result.prediction ? "Phishing" : "Legitimate"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ({Math.round(result.confidence * 100)}% confidence)
                  </span>
                </div>
              </div>

              <Alert
                className={
                  result.status === "safe" ? "border-green-500" : "border-red-500"
                }
              >
                <AlertTitle className="flex items-center">
                  {result.status === "safe" ? (
                    <>This website appears to be safe</>
                  ) : (
                    <>This website is likely dangerous</>
                  )}
                </AlertTitle>
                <AlertDescription>
                  {result.status === "safe" ? (
                    <p>
                      Our AI model analysis indicates this website appears to be legitimate, but always remain cautious.
                    </p>
                  ) : (
                    <p>Our AI model classified this website as phishing.</p>
                  )}

                  {result.reasons.length > 0 && (
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      {result.reasons.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>

              {/* Feedback Section */}
              <div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-1.5 text-sm">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Help improve our detection model
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    POST /api/v1/feedback
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  Was our model classification accurate? Submit feedback with optional comments to help train the model.
                </p>

                {feedbackError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{feedbackError}</AlertDescription>
                  </Alert>
                )}

                {!feedbackSubmitted ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSubmittingFeedback}
                        onClick={() =>
                          handleFeedbackSubmit(result.prediction ? "phishing" : "legitimate")
                        }
                        className="flex items-center gap-1.5"
                      >
                        {isSubmittingFeedback ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ThumbsUp className="h-3.5 w-3.5 text-green-600" />
                        )}
                        Yes, correct ({result.prediction ? "Phishing" : "Legitimate"})
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSubmittingFeedback}
                        onClick={() =>
                          handleFeedbackSubmit(result.prediction ? "legitimate" : "phishing")
                        }
                        className="flex items-center gap-1.5"
                      >
                        {isSubmittingFeedback ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                        )}
                        No, this is actually {result.prediction ? "Legitimate" : "Phishing"}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                        onClick={() => setShowComments(!showComments)}
                      >
                        {showComments ? "Hide comment" : "+ Add comment"}
                      </Button>
                    </div>

                    {showComments && (
                      <div className="space-y-2 pt-1">
                        <Textarea
                          placeholder="Optional notes: e.g. 'False positive, this is an official company portal' or 'Suspicious SMS link'"
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          className="text-xs min-h-[60px]"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-md space-y-1.5">
                    <div className="text-xs text-green-700 dark:text-green-300 font-semibold flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Feedback successfully submitted to backend!
                    </div>
                    {submittedFeedbackDetails && (
                      <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1">
                        <div>
                          <strong>Detection:</strong> {submittedFeedbackDetails.detection_result}
                        </div>
                        <div>
                          <strong>User Label:</strong> {submittedFeedbackDetails.user_label}
                        </div>
                        {submittedFeedbackDetails.comments && (
                          <div className="col-span-2">
                            <strong>Comments:</strong> "{submittedFeedbackDetails.comments}"
                          </div>
                        )}
                      </div>
                    )}
                    <div className="pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => {
                          setFeedbackSubmitted(false)
                          setComments("")
                          setShowComments(false)
                        }}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Submit another feedback
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
          <p>
            Always verify the legitimacy of websites before entering sensitive information
          </p>
          {result && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const target = result.analyzedUrl.startsWith("http")
                  ? result.analyzedUrl
                  : `https://${result.analyzedUrl}`
                window.open(target, "_blank")
              }}
            >
              Visit anyway <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>

      <div className="mt-8 w-full">
        <h3 className="text-lg font-medium mb-4">Safe Browsing Tips</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Check the URL</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Verify the website address. Phishing sites often use URLs that look similar to legitimate sites but with
                slight variations.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Look for HTTPS</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Secure websites use HTTPS and display a padlock icon in the address bar. This indicates encrypted
                communication.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
