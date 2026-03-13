"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function TestWebhookPage() {
  const [phone, setPhone] = useState("+13604043153");
  const [message, setMessage] = useState("1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTestWebhook = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Webhook test completed!");
        setResult(data);
      } else {
        toast.error(data.error || "Webhook test failed");
        setResult(data);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to test webhook");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Test SMS Webhook</CardTitle>
          <CardDescription>
            Simulate a patient replying to slot options SMS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Patient Phone Number
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+13604043153"
            />
            <p className="text-xs text-gray-500 mt-1">
              Must match a patient who has pending slot offers
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Patient Reply (Slot Number)
            </label>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter 1, 2, 3, etc. to select a slot
            </p>
          </div>

          <Button
            onClick={handleTestWebhook}
            disabled={loading || !phone || !message}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {loading ? "Testing Webhook..." : "Test Webhook"}
          </Button>

          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <h3 className="font-semibold mb-2">Result:</h3>
              <pre className="text-sm overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">💡 How to test:</h4>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>First, send slot options to a patient from the Staff Dashboard</li>
              <li>Copy that patient's phone number</li>
              <li>Paste it above and enter which slot number they're choosing (1, 2, 3, etc.)</li>
              <li>Click "Test Webhook" to simulate their SMS reply</li>
              <li>Check the result to see if the slot was confirmed!</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

