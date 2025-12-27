interface FollowUpQuestionsProps {
  questions: string[];
  promptText: string;
  onQuestionClick: (question: string) => void;
  disabled?: boolean;
}

export function FollowUpQuestions({
  questions,
  promptText,
  onQuestionClick,
  disabled = false,
}: FollowUpQuestionsProps) {
  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <div className="heshev-chat__follow-up">
      <span className="heshev-chat__follow-up-prompt">{promptText}</span>
      <div className="heshev-chat__follow-up-questions">
        {questions.map((question, index) => (
          <button
            key={index}
            className="heshev-chat__follow-up-btn"
            onClick={() => onQuestionClick(question)}
            disabled={disabled}
            type="button"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
