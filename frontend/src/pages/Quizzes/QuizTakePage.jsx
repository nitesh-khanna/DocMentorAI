import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

import quizService from "../../services/quizService";
import PageHeader from "../../components/common/PageHeader";
import Spinner from "../../components/common/Spinner";
import toast from "react-hot-toast";
import Button from "../../components/common/Button";

const QuizTakePage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await quizService.getQuizById(quizId);
        setQuiz(response.data);
      } catch (error) {
        toast.error("Failed to fetch quiz.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  const handleOptionChange = (questionId, optionIndex) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz?.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    setSubmitting(true);
    try {
      const formattedAnswers = Object.keys(selectedAnswers).map(
        (questionId) => {
          const question = quiz.questions.find((q) => q._id === questionId);
          const questionIndex = quiz.questions.findIndex(
            (q) => q._id === questionId
          );
          const optionIndex = selectedAnswers[questionId];
          const selectedAnswer = question.options[optionIndex];
          return { questionIndex, selectedAnswer };
        }
      );
      await quizService.submitQuiz(quizId, formattedAnswers);
      toast.success("Quiz submitted successfully!");
      navigate(`/quizzes/${quizId}/results`);
    } catch (error) {
      toast.error("Failed to submit quiz.");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (!quiz || quiz?.questions?.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <p className="text-gray-500 text-lg">
          Quiz not found or has no questions.
        </p>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-10">
      <PageHeader title={quiz.title || "Take Quiz"} />

      {/* Progress Section */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </span>
          <span className="text-orange-600 font-medium">
            {answeredCount} answered
          </span>
        </div>

        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all duration-300"
            style={{
              width: `${
                ((currentQuestionIndex + 1) / quiz.questions.length) * 100
              }%`,
            }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <span className="inline-block mb-3 text-sm font-semibold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
          Question {currentQuestionIndex + 1}
        </span>

        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {currentQuestion.question}
        </h3>

        {/* Options */}
        <div className="space-y-4">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswers[currentQuestion._id] === index;

            return (
              <div
                key={index}
                onClick={() => handleOptionChange(currentQuestion._id, index)}
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition
                  ${
                    isSelected
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-orange-300"
                  }`}
              >
                <div className="text-orange-500">
                  {isSelected && <CheckCircle2 size={20} />}
                </div>
                <span className="text-gray-800">{option}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-2"
        >
          <ChevronLeft size={18} />
          Previous
        </Button>

        {currentQuestionIndex === quiz.questions.length - 1 ? (
          <Button
            onClick={() => handleSubmitQuiz()}
            disabled={submitting}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            Submit Quiz
          </Button>
        ) : (
          <Button
            onClick={handleNextQuestion}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white"
          >
            Next
            <ChevronRight size={18} />
          </Button>
        )}
      </div>
      <div className="flex justify-center gap-3 mt-2">
        {quiz.questions.map((_, index) => {
          const isAnsweredQuestion = selectedAnswers.hasOwnProperty(
            quiz.questions[index]._id
          );
          const isCurrent = index === currentQuestionIndex;

          return (
            <button
              key={index}
              onClick={() => setCurrentQuestionIndex(index)}
              disabled={submitting}
              className={`w-9 h-9 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200
          ${
            isCurrent
              ? "bg-orange-500 text-white shadow"
              : isAnsweredQuestion
              ? "bg-orange-100 text-orange-700"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }
        `}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuizTakePage;
