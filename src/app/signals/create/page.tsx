'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useGlobalNotifications } from "@/app/providers";

function CreateSignalPageContent() {
  const { user } = useRequireAuth();
  const router = useRouter();
  const { showError, showSuccess } = useGlobalNotifications();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    question: '',
    answerOptions: ['', ''],
    voteCount: '100'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // Filter out empty answer options
    const cleanAnswerOptions = formData.answerOptions.filter(option => option.trim() !== '');
    
    if (cleanAnswerOptions.length < 2) {
      showError('Please provide at least 2 answer options');
      return;
    }

    setLoading(true);
    
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.access_token}`,
      };

      const response = await fetch('/api/signals', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: formData.name,
          question: formData.question,
          answerOptions: cleanAnswerOptions,
          voteCount: parseInt(formData.voteCount),
          createdBy: user.profile.sub,
          userEmail: user.profile.email
        }),
      });

      if (response.ok) {
        showSuccess('Signal created successfully!');
        router.push('/signals');
      } else {
        const error = await response.json();
        showError(`Error: ${error.error || 'Failed to create signal'}`);
      }
    } catch (error) {
      console.error('Error creating signal:', error);
      showError('Failed to create signal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addAnswerOption = () => {
    setFormData(prev => ({
      ...prev,
      answerOptions: [...prev.answerOptions, '']
    }));
  };

  const removeAnswerOption = (index: number) => {
    if (formData.answerOptions.length > 2) {
      setFormData(prev => ({
        ...prev,
        answerOptions: prev.answerOptions.filter((_, i) => i !== index)
      }));
    }
  };

  const updateAnswerOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      answerOptions: prev.answerOptions.map((option, i) => 
        i === index ? value : option
      )
    }));
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Signal</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Signal Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                Signal Name
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Bitcoin Sentiment Tracker"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            {/* Question */}
            <div>
              <label htmlFor="question" className="block text-sm font-medium text-gray-900 mb-2">
                Survey Question
              </label>
              <textarea
                id="question"
                required
                rows={3}
                value={formData.question}
                onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                placeholder="e.g., How likely are you to buy Bitcoin in the next 6 months?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            {/* Answer Options */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Answer Options
              </label>
              <div className="space-y-2">
                {formData.answerOptions.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateAnswerOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                    {formData.answerOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeAnswerOption(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addAnswerOption}
                className="mt-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              >
                Add Option
              </button>
            </div>

            {/* Vote Count */}
            <div>
              <label htmlFor="voteCount" className="block text-sm font-medium text-gray-900 mb-2">
                Daily Vote Target
              </label>
              <input
                type="number"
                id="voteCount"
                required
                min="10"
                max="1000"
                value={formData.voteCount}
                onChange={(e) => setFormData(prev => ({ ...prev, voteCount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
              <p className="text-sm text-gray-500 mt-1">
                Number of responses you want to collect per day (10-1000)
              </p>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors"
              >
                {loading ? 'Creating...' : 'Create Signal'}
              </button>
              <Link
                href="/signals"
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CreateSignalPage() {
  return (
    <AuthGuard>
      <CreateSignalPageContent />
    </AuthGuard>
  );
}