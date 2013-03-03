using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Robots_Massacre_Client;

namespace Gfx
{
	public class Art
	{
		public static GBitmap[,] GRAPHICS = Cut(Robots_Massacre_Client.Properties.Resources.Graphics, 30, 30);
		public static GBitmap[,] GRAPHICS_BIG = Cut(Robots_Massacre_Client.Properties.Resources.GraphicsBig, 48, 48);
		public static GBitmap[,] FONT = Cut(Robots_Massacre_Client.Properties.Resources.Font, 8, 8);
		public static GBitmap[,] FONT_BIG = Cut(Robots_Massacre_Client.Properties.Resources.FontBig, 16, 16);

		public static GBitmap[,] Cut(Image image, int w, int h)
		{
			int XTiles = image.Width / w;
			int YTiles = image.Height / h;

			GBitmap[,] Sprites = new GBitmap[XTiles, YTiles];
			Bitmap BM = new Bitmap(image);
			Bitmap Temp;

			for (int x = 0; x < XTiles; ++x)
			{
				for (int y = 0; y < YTiles; ++y)
				{
					Temp = new Bitmap(w, h, PixelFormat.Format32bppPArgb);

					Graphics g = Graphics.FromImage(Temp);
					g.DrawImage(BM, new Rectangle(0, 0, w, h), new Rectangle(x * w, y * h, w, h), GraphicsUnit.Pixel);
					g.Dispose();

					Sprites[x, y] = new GBitmap(Temp);
				}
			}

			return Sprites;
		}

		public static GBitmap Rotate(GBitmap image, int Angle)
		{
			Bitmap BM = new Bitmap(image.Width, image.Height);
			Graphics g = Graphics.FromImage(BM);

			g.TranslateTransform((float)BM.Width / 2, (float)BM.Height / 2);
			g.RotateTransform((float)Angle);
			g.TranslateTransform(-(float)BM.Width / 2, -(float)BM.Height / 2);
			g.InterpolationMode = InterpolationMode.HighQualityBicubic;
			g.DrawImage(image.GetFullImage(), new Point(0, 0));
			g.Dispose();

			return new GBitmap(BM);
		}
	}
}