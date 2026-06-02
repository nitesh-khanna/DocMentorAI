import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import quizService from "../../services/quizService";
import PageHeader from "../../components/common/PageHeader";
import Spinner from "../../components/common/Spinner";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  Target,
  BookOpen,
} from "lucide-react";

const QuizResultPage = () => {
  const { quizId } = useParams();

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const data = await quizService.getQuizResults(quizId);
        setResults(data);
      } catch (error) {
        toast.error("Failed to fetch quiz results.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [quizId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!results || !results.data) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Quiz results not found.</p>
      </div>
    );
  }

  const {
    data: { quiz, results: detailedResults },
  } = results;

  const score = quiz.score;
  const totalQuestions = detailedResults.length;
  const correctAnswers = detailedResults.filter(
    (r) => r.selectedAnswer === r.correctAnswer
  ).length;
  const incorrectAnswers = totalQuestions - correctAnswers;

  const getScoreColor = (score) => {
    if (score >= 80) return "text-orange-500";
    if (score >= 60) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreMessage = (score) => {
    if (score >= 90) return "Outstanding!";
    if (score >= 80) return "Great job!";
    if (score >= 70) return "Good work!";
    if (score >= 60) return "Not bad!";
    return "Keep practicing!";
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      <PageHeader title={`${quiz.title} - Quiz Results`} />

      <Link
        to={`/documents/${quiz.document._id}`}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-orange-500 mb-6"
      >
        <ArrowLeft size={18} />
        Back to Document
      </Link>

      {/* Score Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-100">
          <Trophy className="text-orange-500" />
        </div>

        <p className="text-xs font-semibold text-gray-500 tracking-wide">
          YOUR SCORE
        </p>

        <div className={`mt-2 text-5xl font-bold ${getScoreColor(score)}`}>
          {score}%
        </div>

        <p className="mt-1 text-gray-600">{getScoreMessage(score)}</p>

        <div className="mt-6 flex justify-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-sm">
            <Target size={16} />
            {totalQuestions} Total
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-orange-600 text-sm">
            <CheckCircle2 size={16} />
            {correctAnswers} Correct
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 text-red-600 text-sm">
            <XCircle size={16} />
            {incorrectAnswers} Incorrect
          </div>
        </div>
      </div>

      {/* Detailed Review */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4 text-gray-700">
          <BookOpen size={18} />
          <h2 className="font-semibold">Detailed Review</h2>
        </div>

        <div className="space-y-6">
          {detailedResults.map((item, index) => {
            const isCorrect = item.selectedAnswer === item.correctAnswer;

            return (
              <div
                key={item._id}
                className="bg-white border border-gray-200 rounded-xl p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="font-semibold text-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-gray-800">Question {index + 1}</p>
                  {isCorrect ? (
                    <CheckCircle2 className="text-orange-500" />
                  ) : (
                    <XCircle className="text-red-500" />
                  )}
                </div>

                <p className="mt-2 text-gray-800 font-semibold">{item.question}</p>

                <div className="mt-4 space-y-2">
                  {item.options.map((opt, i) => {
                    const optIsCorrect = opt === item.correctAnswer;
                    const optIsSelected = opt === item.selectedAnswer;

                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm
                          ${optIsCorrect
                            ? "border-orange-300 bg-orange-50"
                            : optIsSelected
                              ? "border-red-300 bg-red-50"
                              : "border-gray-200 bg-gray-50"
                          }`}
                      >
                        <span className="text-gray-800">{opt}</span>

                        <div className="flex items-center gap-2 text-xs font-medium">
                          {optIsSelected && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                              Your Answer
                            </span>
                          )}
                          {optIsCorrect && (
                            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                              Correct Answer
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {item.explanation && (
                  <div className="p-4 mt-3 bg-linear-to-br from-slate-50 to-slate-100/50 border border-slate-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center mt-0.5">
                        <BookOpen className="w-4 h-4 text-slate-600" strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1">
                          Explanation
                        </p>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {item.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-8 flex justify-center">
        <Link to={`/documents/${quiz.document._id}`}>
          <button
            className="
        group/btn relative
        h-11 px-8
        inline-flex items-center gap-3
        rounded-xl
        bg-gradient-to-r from-orange-500 to-orange-500
        text-sm font-semibold text-white
        shadow-lg shadow-orange-500/25
        transition-all duration-200
        hover:from-orange-600 hover:to-orange-600
        active:scale-95
        overflow-hidden
      "
          >
            {/* glow / sweep layer */}
            <span
              className="
          pointer-events-none absolute inset-0
          bg-white/10
          opacity-0
          group-hover/btn:opacity-100
          transition-opacity duration-200
        "
            />

            {/* content */}
            <ArrowLeft
              className="
          relative z-10
          w-4 h-4
          transition-transform duration-200
          group-hover/btn:-translate-x-1
        "
              strokeWidth={2.5}
            />
            <span className="relative z-10">Return to Document</span>
          </button>
        </Link>
      </div>
    </div>
  );
};

export default QuizResultPage;