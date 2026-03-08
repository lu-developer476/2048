from django.db import models


class Score(models.Model):
    name = models.CharField(max_length=30)
    points = models.PositiveIntegerField()
    moves = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-points", "moves", "-created_at"]

    def __str__(self):
        return f"{self.name} - {self.points}"
