"""
Management command: seed_demo_data

Creates a handful of demo students with profiles, subjects, and
availability so you can immediately see the AI matching engine,
dashboard, and other modules working with realistic data.

Usage:
    python manage.py seed_demo_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from profiles.models import Subject, StudentProfile, Availability

User = get_user_model()

DEMO_STUDENTS = [
    dict(name='Ravi Kumar', email='ravi@demo.com', college='ABC Engineering College',
         department='CSE', year_of_study=2, subjects=['Python', 'DSA'],
         weak=['DSA'], skill_level='beginner', language='en',
         goals='I want to master Python basics and crack coding interviews',
         availability=[('mon', 'evening'), ('wed', 'evening'), ('sat', 'weekend')]),
    dict(name='Priya Singh', email='priya@demo.com', college='ABC Engineering College',
         department='CSE', year_of_study=2, subjects=['Python', 'DSA'],
         weak=['DSA'], skill_level='beginner', language='en',
         goals='My goal is to learn Python fundamentals and prepare for interviews',
         availability=[('mon', 'evening'), ('thu', 'evening'), ('sat', 'weekend')]),
    dict(name='Arjun Reddy', email='arjun@demo.com', college='XYZ Institute of Technology',
         department='ECE', year_of_study=3, subjects=['DSA', 'DBMS'],
         weak=['DBMS'], skill_level='intermediate', language='en',
         goals='Preparing for placement exams, need to strengthen DBMS',
         availability=[('tue', 'morning'), ('fri', 'afternoon')]),
    dict(name='Lakshmi Narayanan', email='lakshmi@demo.com', college='ABC Engineering College',
         department='CSE', year_of_study=2, subjects=['Python', 'Web Development'],
         weak=['Web Development'], skill_level='intermediate', language='ta',
         goals='Want to build full-stack projects using Python and React',
         availability=[('mon', 'evening'), ('wed', 'evening')]),
    dict(name='Karthik Subramaniam', email='karthik@demo.com', college='ABC Engineering College',
         department='CSE', year_of_study=4, subjects=['DSA', 'Machine Learning'],
         weak=[], skill_level='advanced', language='en',
         goals='Mentoring juniors and preparing for ML research roles',
         availability=[('sat', 'weekend'), ('sun', 'weekend')]),
]


class Command(BaseCommand):
    help = 'Seed demo students, profiles, and availability for the Study AI Matcher project.'

    def handle(self, *args, **options):
        subjects_cache = {}

        def get_subject(name):
            if name not in subjects_cache:
                subjects_cache[name], _ = Subject.objects.get_or_create(name=name)
            return subjects_cache[name]

        created_count = 0
        for entry in DEMO_STUDENTS:
            user, created = User.objects.get_or_create(
                email=entry['email'],
                defaults=dict(
                    name=entry['name'], college=entry['college'],
                    department=entry['department'], year_of_study=entry['year_of_study'],
                )
            )
            if created:
                user.set_password('Demo@1234')
                user.save()
                created_count += 1

            profile, _ = StudentProfile.objects.get_or_create(user=user)
            profile.skill_level = entry['skill_level']
            profile.preferred_language = entry['language']
            profile.study_goals = entry['goals']
            profile.skills = ', '.join(entry['subjects'])
            profile.save()
            profile.subjects.set([get_subject(s) for s in entry['subjects']])
            profile.weak_subjects.set([get_subject(s) for s in entry['weak']])

            for day, block in entry['availability']:
                Availability.objects.get_or_create(
                    user=user, day=day, time_block=block,
                    defaults={'study_hours': 2}
                )

            self.stdout.write(self.style.SUCCESS(
                f"{'Created' if created else 'Updated'}: {entry['name']} <{entry['email']}>"
            ))

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. {created_count} new student(s) created. "
            f"All demo accounts use password: Demo@1234"
        ))
        self.stdout.write(
            "Try logging in as ravi@demo.com / priya@demo.com and calling "
            "GET /api/matching/find/ to see the AI engine suggest them as study partners."
        )
