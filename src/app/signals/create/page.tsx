'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useCreateSignal } from "@/hooks/useSignalsApi";

function CreateSignalPageContent() {
  const { user } = useRequireAuth();
  const router = useRouter();
  const createSignal = useCreateSignal();
  const [formData, setFormData] = useState({
    name: '',
    question: '',
    answerOptions: ['', ''],
    voteCount: '100',
    runFrequency: 'daily'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // Filter out empty answer options
    const cleanAnswerOptions = formData.answerOptions.filter(option => option.trim() !== '');
    
    if (cleanAnswerOptions.length < 2) {
      // Use React Query's built-in error handling
      return;
    }

    // Use React Query mutation
    createSignal.mutate({
      name: formData.name,
      question: formData.question,
      answerOptions: cleanAnswerOptions,
      voteCount: parseInt(formData.voteCount),
      runFrequency: formData.runFrequency,
      createdBy: user.profile.sub,
      userEmail: user.profile.email || ''
    }, {
      onSuccess: () => {
        router.push('/signals');
      }
    });
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
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-12">
            <h1 className="page-header text-balance">Create New Signal</h1>
            <p className="page-subtitle text-balance">
              Set up a recurring survey to track crowd insights and population trends
            </p>
          </div>
          
          <div className="card animate-slide-up">
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {/* Signal Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-3">
                  Signal Name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Bitcoin Sentiment Tracker"
                  className="input-field"
                />
              </div>

              {/* Question */}
              <div>
                <label htmlFor="question" className="block text-sm font-semibold text-gray-900 mb-3">
                  Survey Question
                </label>
                <textarea
                  id="question"
                  required
                  rows={4}
                  value={formData.question}
                  onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="e.g., How likely are you to buy Bitcoin in the next 6 months?"
                  className="input-field resize-none"
                />
              </div>

              {/* Answer Options */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Answer Options
                </label>
                <div className="space-y-3">
                  {formData.answerOptions.map((option, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateAnswerOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1 input-field"
                      />
                      {formData.answerOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeAnswerOption(index)}
                          className="px-4 py-3 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors border border-red-200 hover:border-red-300"
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
                  className="mt-4 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
                >
                  + Add Option
                </button>
              </div>

              {/* Vote Count */}
              <div>
                <label htmlFor="voteCount" className="block text-sm font-semibold text-gray-900 mb-3">
                  Vote Target per Run
                </label>
                <input
                  type="number"
                  id="voteCount"
                  required
                  min="100"
                  max="1000"
                  value={formData.voteCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, voteCount: e.target.value }))}
                  className="input-field"
                />
                <p className="text-sm text-gray-600 mt-2">
                  Number of responses you want to collect per run (100-1000)
                </p>
              </div>

              {/* Run Frequency */}
              <div>
                <label htmlFor="runFrequency" className="block text-sm font-semibold text-gray-900 mb-3">
                  Run Frequency
                </label>
                <select
                  id="runFrequency"
                  value={formData.runFrequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, runFrequency: e.target.value }))}
                  className="input-field"
                >
                  <option value="hourly">Hourly - Run every hour</option>
                  <option value="daily">Daily - Run every day</option>
                  <option value="weekly">Weekly - Run every week</option>
                  <option value="monthly">Monthly - Run every month</option>
                </select>
                <p className="text-sm text-gray-600 mt-2">
                  Choose how frequently this signal should collect new responses
                </p>
              </div>

              {/* Submit */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={createSignal.isPending}
                  className="btn-primary flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createSignal.isPending ? 'Creating...' : 'Create Signal'}
                </button>
                <Link
                  href="/signals"
                  className="btn-secondary flex-1 sm:flex-none text-center"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
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