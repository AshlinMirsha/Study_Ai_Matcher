"""
notifications app - helper to create notifications from anywhere in the
codebase without circular-import headaches (other apps import this
function, not the model directly, keeping the dependency one-directional).
"""
def notify(recipient, notification_type, title, body='', link=''):
    from .models import Notification
    return Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        body=body,
        link=link,
    )
