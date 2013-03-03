using Gfx;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Gui.Components
{
	public static class GFont
	{
		private static readonly int LETTER_SIZE = 8;
		private static string Alphabet = "abcdefghijklmnopqrstuvwxyz0123456789.,!?'\"-+=/\\%()<>:; ";

		public static void Write(GBitmap screen, string message, int size, int x, int y)
		{
			message = message.ToLower();
			int currentLetterSize = GetLetterDimension(size);

			for (int i = 0; i < message.Length; ++i)
			{
				int Letter = Alphabet.IndexOf(message[i]);
				screen.Blit(_getLetterBitmap(Letter, size), x + i * currentLetterSize + screen.XOffset, y + screen.YOffset);
			}
		}

		private static GBitmap _getLetterBitmap(int letter, int size)
		{
			return size == 1 ? Art.FONT[letter, 0] : Art.FONT_BIG[letter, 0];
		}

		public static void Write(GBitmap screen, string message, int size, Point point)
		{
			Write(screen, message, size, point.X, point.Y);
		}

		public static void WriteXCenter(GBitmap screen, string message, int size, int y)
		{
			int w = GetStringWidth(message, size);
			Write(screen, message, size, screen.ScreenWidth / 2 - w / 2, y);
		}

		public static void WriteCenterLine(GBitmap screen, string message, int size, int yo)
		{
			int w = GetStringWidth(message, size);
			int h = GetLetterDimension(size);
			Write(screen, message, size, screen.ScreenWidth / 2 - w / 2, screen.ScreenHeight / 2 - h + yo);
		}

		public static int GetLetterDimension(int size)
		{
			return LETTER_SIZE * size;
		}

		public static int GetStringWidth(string message, int size)
		{
			return message.Length * GetLetterDimension(size);
		}

		public static string GenerateString(int len)
		{
			StringBuilder s = new StringBuilder();
			for (int i = 1; i <= len; ++i)
			{
				s.Append(Alphabet[Program.Rand.Next(0, 25)]);
			}
			return s.ToString();
		}

        public static void WriteRight(GBitmap screen, string Text, int Size, int X, int Y, int Width)
        {
            int x = X + Width - GetStringWidth(Text, Size);
            Write(screen, Text, Size, x, Y);
        }

        public static void WriteCenter(GBitmap screen, string Text, int Size, int X, int Y, int Width)
        {
            Write(screen, Text, Size, X + Width/2 - GetStringWidth(Text, Size) / 2, Y);
        }
    }
}