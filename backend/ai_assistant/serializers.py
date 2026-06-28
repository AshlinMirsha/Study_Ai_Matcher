"""ai_assistant app - serializers for Module 8."""
from rest_framework import serializers
from .models import StudySuggestion, ChatbotMessage, Quiz, QuizQuestion


class StudySuggestionSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True, default='')

    class Meta:
        model = StudySuggestion
        fields = ['id', 'subject', 'subject_name', 'text', 'is_done', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChatbotMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatbotMessage
        fields = ['id', 'role', 'content', 'created_at']
        read_only_fields = fields


class ChatbotAskSerializer(serializers.Serializer):
    message = serializers.CharField()


class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = ['id', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'student_answer']
        # NOTE: correct_option intentionally excluded until the quiz is submitted,
        # so students can't see answers while attempting the quiz.


class QuizQuestionResultSerializer(serializers.ModelSerializer):
    is_correct = serializers.SerializerMethodField()

    class Meta:
        model = QuizQuestion
        fields = ['id', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d',
                  'correct_option', 'student_answer', 'is_correct']

    def get_is_correct(self, obj):
        return obj.is_correct()


class QuizSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True, default='')

    class Meta:
        model = Quiz
        fields = ['id', 'subject', 'subject_name', 'topic', 'score', 'questions', 'created_at']
        read_only_fields = ['id', 'score', 'created_at']


class QuizGenerateSerializer(serializers.Serializer):
    topic = serializers.CharField()
    subject = serializers.IntegerField(required=False, allow_null=True)
    num_questions = serializers.IntegerField(default=5, min_value=1, max_value=15)


class QuizSubmitSerializer(serializers.Serializer):
    answers = serializers.DictField(
        child=serializers.ChoiceField(choices=['a', 'b', 'c', 'd']),
        help_text='{"<question_id>": "a", ...}'
    )
