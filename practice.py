import random
import time
import tkinter as tk

WIDTH = 900
HEIGHT = 620
GROUND_Y = 540
GRAVITY = 0.48
FLAP_POWER = -8.7
PIPE_SPEED = 3.9
PIPE_WIDTH = 95
PIPE_GAP = 210
PIPE_INTERVAL = 1550


class Bird:
    def __init__(self):
        self.x = 150
        self.y = HEIGHT // 2
        self.radius = 23
        self.velocity = 0
        self.rotation = 0

    def flap(self):
        self.velocity = FLAP_POWER

    def draw(self, canvas):
        x = int(self.x)
        y = int(self.y)
        r = self.radius

        # body shape
        canvas.create_oval(x - r, y - r, x + r, y + r, fill="#ffd166", outline="#f59e0b", width=4)

        # wing
        wing_y = y + 3
        wing_x1 = x - 10
        wing_x2 = x + 18
        canvas.create_oval(wing_x1, wing_y - 11, wing_x2, wing_y + 12, fill="#f4b942", outline="")

        # belly
        canvas.create_oval(x - 8, y - 1, x + 14, y + 17, fill="#fff4c2", outline="")

        # beak
        canvas.create_polygon(x + 18, y + 1, x + 34, y + 6, x + 19, y + 12, fill="#ff8f1f", outline="#dd6a0a", width=2)

        # eye
        canvas.create_oval(x + 9, y - 5, x + 17, y + 3, fill="white", outline="")
        canvas.create_oval(x + 11, y - 3, x + 15, y + 1, fill="#111827", outline="")
        canvas.create_oval(x + 12.5, y - 3.5, x + 13.6, y - 2.2, fill="white", outline="")

        # tail
        canvas.create_polygon(x - 18, y - 1, x - 34, y - 12, x - 28, y + 9, fill="#f59e0b", outline="")

        # motion trail
        if self.velocity < 0:
            canvas.create_line(x - 22, y + 5, x - 42, y + 15, fill="#ffe082", width=3)
            canvas.create_line(x - 34, y + 12, x - 54, y + 18, fill="#fff7cc", width=2)


class Pipe:
    def __init__(self, x):
        self.x = x
        self.width = PIPE_WIDTH
        self.gap_top = random.randint(150, 255)
        self.gap_height = PIPE_GAP
        self.scored = False

    def update(self):
        self.x -= PIPE_SPEED

    def draw(self, canvas):
        top_h = self.gap_top
        bottom_y = self.gap_top + self.gap_height

        # top cylinder pipe
        canvas.create_rectangle(self.x, 0, self.x + self.width, top_h, fill="#4ade80", outline="#15803d", width=4)
        canvas.create_rectangle(self.x - 8, top_h - 18, self.x + self.width + 8, top_h, fill="#70e2a3", outline="")
        canvas.create_rectangle(self.x + 10, top_h - 12, self.x + self.width - 10, top_h + 7, fill="#22c55e", outline="")

        # bottom cylinder pipe
        canvas.create_rectangle(self.x, bottom_y, self.x + self.width, HEIGHT - 40, fill="#4ade80", outline="#15803d", width=4)
        canvas.create_rectangle(self.x - 8, bottom_y, self.x + self.width + 8, bottom_y + 18, fill="#70e2a3", outline="")
        canvas.create_rectangle(self.x + 10, bottom_y - 8, self.x + self.width - 10, bottom_y + 8, fill="#22c55e", outline="")

        # grass detail
        for offset in range(0, self.width + 10, 18):
            canvas.create_line(self.x + offset, top_h, self.x + offset + 10, top_h - 18, fill="#166534", width=3)
            canvas.create_line(self.x + offset, bottom_y, self.x + offset + 10, bottom_y + 18, fill="#166534", width=3)


class FlappyBirdGame:
    def __init__(self, root):
        self.root = root
        self.root.title("Crazy Bird Game")
        self.root.geometry(f"{WIDTH}x{HEIGHT}")
        self.root.resizable(False, False)
        self.root.configure(bg="#0b1020")

        self.canvas = tk.Canvas(root, width=WIDTH, height=HEIGHT, bg="#0b1020", highlightthickness=0)
        self.canvas.pack()

        self.root.bind("<space>", self.handle_input)
        self.root.bind("<Up>", self.handle_input)
        self.root.bind("<Button-1>", self.handle_input)

        self.bird = Bird()
        self.pipes = []
        self.score = 0
        self.state = "ready"
        self.last_pipe_time = 0
        self.dead_flash = 0
        self.best_score = 0

        self.loop()

    def handle_input(self, event=None):
        if self.state == "ready":
            self.state = "playing"
            self.bird.flap()
            self.last_pipe_time = time.time() * 1000
        elif self.state == "playing":
            self.bird.flap()
        elif self.state == "gameover":
            self.reset_game()
            self.state = "playing"
            self.bird.flap()
            self.last_pipe_time = time.time() * 1000

    def reset_game(self):
        self.bird = Bird()
        self.pipes = []
        self.score = 0
        self.state = "ready"
        self.dead_flash = 0
        self.last_pipe_time = 0
        self.best_score = max(self.best_score, self.score)

    def spawn_pipe(self):
        pipe = Pipe(WIDTH + 50)
        self.pipes.append(pipe)

    def check_collision(self):
        bird = self.bird
        for pipe in self.pipes:
            within_x = bird.x + bird.radius > pipe.x and bird.x - bird.radius < pipe.x + pipe.width
            if not within_x:
                continue

            if bird.y - bird.radius < pipe.gap_top or bird.y + bird.radius > pipe.gap_top + PIPE_GAP:
                return True

        if bird.y + bird.radius >= GROUND_Y or bird.y - bird.radius <= 0:
            return True

        return False

    def draw_background(self):
        self.canvas.delete("all")

        # sky
        self.canvas.create_rectangle(0, 0, WIDTH, HEIGHT, fill="#0b1120", outline="")

        # parallax layers
        self.canvas.create_rectangle(0, 0, WIDTH, 270, fill="#1d4ed8", outline="")
        self.canvas.create_rectangle(0, 270, WIDTH, HEIGHT, fill="#0ea5e9", outline="")

        # mountains
        self.canvas.create_polygon(0, 340, 120, 200, 260, 320, 420, 180, 560, 330, 700, 205, 840, 325, 900, 340, fill="#1e293b", outline="")
        self.canvas.create_polygon(0, 365, 150, 240, 280, 335, 470, 220, 620, 340, 770, 240, 900, 365, fill="#334155", outline="")

        # sun glow
        self.canvas.create_oval(650, 50, 835, 235, fill="#fbbf24", outline="", stipple="gray25")
        self.canvas.create_oval(690, 90, 800, 200, fill="#fde68a", outline="")

        # clouds with different sizes
        cloud_positions = [(90, 110), (280, 135), (520, 118), (730, 150)]
        for x, y in cloud_positions:
            self.canvas.create_oval(x, y, x + 70, y + 40, fill="#e2e8f0", outline="")
            self.canvas.create_oval(x + 25, y - 20, x + 95, y + 45, fill="#e2e8f0", outline="")
            self.canvas.create_oval(x + 75, y + 5, x + 140, y + 42, fill="#e2e8f0", outline="")

        # distant trees
        for x in range(-30, WIDTH + 50, 42):
            self.canvas.create_rectangle(x, 395, x + 18, 470, fill="#0f766e", outline="")
            self.canvas.create_polygon(x - 10, 395, x + 9, 330, x + 28, 395, fill="#0b5d5d", outline="")

        # little flying birds
        for x in [120, 260, 480, 620, 790]:
            self.canvas.create_line(x, 90, x + 12, 80, fill="#e2e8f0", width=2)
            self.canvas.create_line(x + 12, 80, x + 24, 90, fill="#e2e8f0", width=2)

    def draw_ground(self):
        self.canvas.create_rectangle(0, GROUND_Y, WIDTH, HEIGHT, fill="#5b3d2b", outline="")
        self.canvas.create_rectangle(0, GROUND_Y + 24, WIDTH, HEIGHT, fill="#7c4b36", outline="")

        for x in range(-20, WIDTH + 40, 32):
            self.canvas.create_line(x, GROUND_Y + 18, x + 18, GROUND_Y + 18, fill="#facc15", width=5)
            self.canvas.create_line(x + 9, GROUND_Y + 36, x + 28, GROUND_Y + 36, fill="#fbbf24", width=5)

        for x in range(0, WIDTH + 30, 45):
            self.canvas.create_rectangle(x, GROUND_Y - 8, x + 8, GROUND_Y + 8, fill="#14532d", outline="")
            self.canvas.create_line(x + 4, GROUND_Y - 8, x + 4, GROUND_Y - 28, fill="#166534", width=3)

    def draw_pipes(self):
        for pipe in self.pipes:
            pipe.draw(self.canvas)

    def draw_score(self):
        self.canvas.create_text(WIDTH // 2, 52, text=str(self.score), fill="#fef3c7",
                                font=("Arial", 34, "bold"), anchor="center")
        self.canvas.create_text(760, 52, text=f"Best: {self.best_score}", fill="#bfdbfe",
                                font=("Arial", 18, "bold"), anchor="center")

    def draw_start_overlay(self):
        self.canvas.create_rectangle(140, 140, WIDTH - 140, HEIGHT - 130, fill="#0f172a", outline="#8b5cf6", width=4)
        self.canvas.create_text(WIDTH // 2, 220, text="Crazy Bird", fill="#f8fafc", font=("Arial", 36, "bold"))
        self.canvas.create_text(WIDTH // 2, 275, text="Press Space or Click", fill="#e2e8f0", font=("Arial", 28, "bold"))
        self.canvas.create_text(WIDTH // 2, 315, text="to start flying!", fill="#93c5fd", font=("Arial", 18))

    def draw_gameover(self):
        self.canvas.create_rectangle(200, 200, WIDTH - 200, HEIGHT - 180, fill="#111827", outline="#f472b6", width=4)
        self.canvas.create_text(WIDTH // 2, 255, text="Game Over", fill="#fca5a5", font=("Arial", 32, "bold"))
        self.canvas.create_text(WIDTH // 2, 300, text=f"Score: {self.score}", fill="#fef3c7", font=("Arial", 22, "bold"))
        self.canvas.create_text(WIDTH // 2, 345, text="Press Space or Click to restart", fill="#93c5fd", font=("Arial", 18))

    def draw(self):
        self.draw_background()
        self.draw_pipes()
        self.bird.draw(self.canvas)
        self.draw_ground()
        self.draw_score()

        if self.state == "ready":
            self.draw_start_overlay()
        elif self.state == "gameover":
            self.draw_gameover()

    def loop(self):
        if self.state == "playing":
            self.bird.velocity += GRAVITY
            self.bird.y += self.bird.velocity
            self.bird.rotation = max(-35, min(90, self.bird.velocity * 8))

            now = time.time() * 1000
            if now - self.last_pipe_time >= PIPE_INTERVAL:
                self.spawn_pipe()
                self.last_pipe_time = now

            for pipe in self.pipes:
                pipe.update()
                if not pipe.scored and pipe.x + pipe.width < self.bird.x:
                    pipe.scored = True
                    self.score += 1

            self.pipes = [pipe for pipe in self.pipes if pipe.x + pipe.width > -20]

            if self.check_collision():
                self.best_score = max(self.best_score, self.score)
                self.state = "gameover"

        self.draw()
        self.root.after(16, self.loop)


if __name__ == "__main__":
    root = tk.Tk()
    game = FlappyBirdGame(root)
    root.mainloop()
