# Deployment Guide

This project is ready to be deployed to any cloud provider that supports Python or Docker, such as **Render**, **Railway**, **Hugging Face Spaces**, or **Heroku**.

## Option 1: Deploy to Hugging Face Spaces (Recommended for AI Demos)
Hugging Face Spaces is excellent for hosting AI models and finding them a permanent home.

1.  Create an account at [huggingface.co](https://huggingface.co/join).
2.  Create a **New Space**.
3.  Enter a name (e.g., `helmet-detection`).
4.  Select **Docker** as the SDK.
5.  Click **Create Space**.
6.  You will be given git commands. Run them in your local terminal:
    ```bash
    git clone https://huggingface.co/spaces/<your-username>/helmet-detection
    # Copy all your project files into this new directory
    cd helmet-detection
    git add .
    git commit -m "Initial commit"
    git push
    ```
    *Note: You may need to ensure Large File Storage (Git LFS) is enabled if your weights are large, but 87MB (Large model) typically fits in standard git push limits (100MB).*

## Option 2: Deploy to Render (Web Hosting)
1.  Push your code to a generic GitHub repository.
2.  Sign up at [render.com](https://render.com).
3.  Click **New +** and select **Web Service**.
4.  Connect your GitHub repository.
5.  Select **Docker** as the Runtime (it will automatically detect the `Dockerfile`).
6.  Select the **Free** instance type.
7.  Click **Create Web Service**.

**Note on Memory:**
This application loads three YOLO models (Nano, Small, Large). The combined memory usage might exceed the free tier limits (512MB RAM) of some providers.
If the app crashes with "Out of Memory" (OOM):
- Use only the Small or Nano model for all tasks by modifying `app.py`.
- Upgrade to a paid plan with more RAM.
