using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;

namespace Gfx
{
	public class GBitmap
	{
		public int Width, Height, ScreenWidth, ScreenHeight;
		public int XOffset = 0, YOffset = 0;

		private Bitmap Pixels;

		public GBitmap(int w, int h)
		{
			InitBitmap(w, h);
		}

		public GBitmap(Bitmap image)
		{
			InitBitmap(image.Width, image.Height);
			SetImage(image);
		}

		private void InitBitmap(int w, int h)
		{
			this.Width = w;
			this.Height = h;
			Pixels = new Bitmap(w, h, PixelFormat.Format32bppPArgb);
		}

		public void SetScreenSize(int w, int h)
		{
			ScreenWidth = w;
			ScreenHeight = h;
		}

		public void SetOffset(int xo, int yo)
		{
			XOffset = xo;
			YOffset = yo;
		}

		public void Blit(Bitmap source, int x, int y)
		{
			if (false)
			{
				if (x + source.Width > Width || y + source.Height > Height || x < 0 || y < 0) return;

				BitmapData source_data = source.LockBits(new Rectangle(0, 0, source.Width, source.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppPArgb);
				BitmapData data = Pixels.LockBits(new Rectangle(x, y, source.Width, source.Height), ImageLockMode.WriteOnly, PixelFormat.Format32bppPArgb);
				IntPtr source_scanner, scanner;

				byte[] blitting_bytes = new byte[source_data.Stride];

				for (int row = 0; row < source_data.Height; ++row)
				{
					source_scanner = (IntPtr)(source_data.Scan0.ToInt64() + row * source_data.Stride);
					scanner = (IntPtr)(data.Scan0.ToInt64() + row * data.Stride);
					Marshal.Copy(source_scanner, blitting_bytes, 0, blitting_bytes.Length);
					Marshal.Copy(blitting_bytes, 0, scanner, blitting_bytes.Length);
				}

				source.UnlockBits(source_data);
				Pixels.UnlockBits(data);
			}
			else
			{
				using (Graphics g = Graphics.FromImage(Pixels))
				{
					g.DrawImageUnscaled(source, x, y);
				}
			}
		}

		public void Blit(GBitmap source, int x, int y)
		{
			Blit(source.GetFullImage(), x, y);
		}

		public Bitmap GetFullImage()
		{
			return Pixels;
		}

		public Bitmap GetClippedImage()
		{
			Bitmap Clipping = new Bitmap(ScreenWidth, ScreenHeight);

			using (Graphics g = Graphics.FromImage(Clipping))
			{
				g.DrawImage(Pixels, new Rectangle(0, 0, ScreenWidth, ScreenHeight), new Rectangle(XOffset, YOffset, ScreenWidth, ScreenHeight), GraphicsUnit.Pixel);
				g.Dispose();
			}

			return Clipping;
		}

		public void SetImage(Bitmap image)
		{
			Pixels = image;
		}

		// Utilities

		public static double[] ColorToHSV(Color color)
		{
			double hue, saturation, value;

			int max = Math.Max(color.R, Math.Max(color.G, color.B));
			int min = Math.Min(color.R, Math.Min(color.G, color.B));

			hue = color.GetHue();
			saturation = (max == 0) ? 0 : 1d - (1d * min / max);
			value = max / 255d;

			return new double[] { hue, saturation, value };
		}

		public static Color ColorFromHSV(double hue, double saturation, double value)
		{
			int hi = Convert.ToInt32(Math.Floor(hue / 60)) % 6;
			double f = hue / 60 - Math.Floor(hue / 60);

			value = value * 255;
			int v = Convert.ToInt32(value);
			int p = Convert.ToInt32(value * (1 - saturation));
			int q = Convert.ToInt32(value * (1 - f * saturation));
			int t = Convert.ToInt32(value * (1 - (1 - f) * saturation));

			if (hi == 0) return Color.FromArgb(255, v, t, p);
			else if (hi == 1) return Color.FromArgb(255, q, v, p);
			else if (hi == 2) return Color.FromArgb(255, p, v, t);
			else if (hi == 3) return Color.FromArgb(255, p, q, v);
			else if (hi == 4) return Color.FromArgb(255, t, p, v);
			else return Color.FromArgb(255, v, p, q);
		}

		public void SetPixel(int x, int y, Color col)
		{
			Pixels.SetPixel(x, y, col);
		}

		// Simple geometry

		public void Fill(int a, int r, int g, int b)
		{
			using (Graphics gr = Graphics.FromImage(Pixels)) gr.FillRectangle(new SolidBrush(Color.FromArgb(a, r, g, b)), 0, 0, Width, Height);
		}

		public void DrawLine(Color col, int width, int xs, int ys, int xe, int ye)
		{
			using (Graphics gr = Graphics.FromImage(Pixels)) gr.DrawLine(new Pen(col, width), new Point(xs, ys), new Point(xe, ye));
		}

		public void FillRect(Color col, int x, int y, int w, int h)
		{
			using (Graphics gr = Graphics.FromImage(Pixels)) gr.FillRectangle(new SolidBrush(col), x, y, w, h);
		}

		public void DrawRect(Color col, int border, int x, int y, int w, int h)
		{
			using (Graphics gr = Graphics.FromImage(Pixels)) gr.DrawRectangle(new Pen(col, border), x, y, w, h);
		}

		public void FillCircle(Color col, int x, int y, int w, int h)
		{
			using (Graphics gr = Graphics.FromImage(Pixels)) gr.FillEllipse(new SolidBrush(col), x, y, w, h);
		}

		public void SmoothEraseCircle(int x, int y, int r)
		{
			using (Graphics gr = Graphics.FromImage(Pixels))
			{
				gr.CompositingMode = CompositingMode.SourceCopy;
				gr.FillEllipse(Brushes.Transparent, x, y, r, r);
			}
		}

		public void EraseRect(int x, int y, int w, int h)
		{
			using (Graphics gr = Graphics.FromImage(Pixels))
			{
				gr.CompositingMode = CompositingMode.SourceCopy;
				gr.FillRectangle(Brushes.Transparent, x, y, w, h);
			}
		}

		public void ChangeHue(double delta)
		{
			double[] data;

			for (int x = 0; x < Width; ++x)
			{
				for (int y = 0; y < Height; ++y)
				{
					Color pixel = Pixels.GetPixel(x, y);

					if (pixel.A > 0)
					{
						data = ColorToHSV(pixel);
						data[0] += delta;
						if (data[0] < 0) data[0] = 0;
						if (data[0] > 255.0) data[0] = 255.0;
						Pixels.SetPixel(x, y, ColorFromHSV(data[0], data[1], data[2]));
					}
				}
			}
		}
	}
}