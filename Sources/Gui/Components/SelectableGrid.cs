using Gfx;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;

namespace Gui.Components
{
	public class GridItem
	{
		public int Width, Height;
		public string Capture;
		public GBitmap Thumbnail;

		public GridItem(string c, GBitmap t)
		{
			Init(c, t);
		}

		public GridItem(int c, GBitmap t)
		{
			Init(c.ToString(), t);
		}

		public GridItem(double c, GBitmap t)
		{
			Init(Convert.ToString(c), t);
		}

		private void Init(string c, GBitmap t)
		{
			this.Capture = c;
			this.Thumbnail = t;
			this.Width = Thumbnail.Width;
			this.Height = Thumbnail.Height + GFont.GetLetterDimension(1) + 10;
		}
	}

	public class SelectableGrid : GuiComponent
	{
		private int MaxRowWidth;
		private int Margin = 5;
		private int SelectionBorder = 1;
		private Color SelectionColor = Color.FromArgb(255, 255, 255, 255);
		private int ItemW = -1, ItemH = -1;

		public List<GridItem> Grid = new List<GridItem>();
		public int Selected = 0;

		public SelectableGrid(InputHandler Input, int x, int y, int mw)
			: base(Input, x, y)
		{
            IsFocused = true;
			this.MaxRowWidth = mw;
		}

		public override void Update()
		{
            if (!IsFocused) return;   
			base.Update();

			bool moveToLast = false;

			if (Input.Left.Clicked) --Selected;
			if (Input.Right.Clicked) ++Selected;
			if (Input.Up.Clicked) Selected -= MaxRowWidth;
			if (Input.Down.Clicked)
			{
				Selected += MaxRowWidth;
				moveToLast = true;
			}

			if (Selected < 0) Selected += Grid.Count;
			if (Selected >= Grid.Count && !moveToLast) Selected -= Grid.Count;
			if (Selected >= Grid.Count && moveToLast) Selected = Grid.Count - 1;
		}

		public override void Render(GBitmap screen)
		{
			int index = 0;
			int cols = 0;

			int sx = X;
			int x = sx;
			int y = Y;

			foreach (GridItem item in Grid)
			{
				if (ItemW != -1 && ItemH != -1)
				{
					item.Width = ItemW;
					item.Height = ItemH;
				}

				++cols;

				if (Selected == index)
				{
					screen.FillRect(SelectionColor, x - SelectionBorder, y - SelectionBorder, item.Width + SelectionBorder, item.Height + SelectionBorder);
					screen.EraseRect(x, y, item.Width - SelectionBorder, item.Height - SelectionBorder);
				}

				screen.Blit(item.Thumbnail, x + (item.Width - item.Thumbnail.Width) / 2, y + (item.Height - item.Thumbnail.Height) / 2);
				GFont.WriteCenter(screen, item.Capture, 1, x, y + item.Height + 10, item.Width);

				x += item.Width + Margin;

				if (cols >= MaxRowWidth)
				{
					cols = 0;
					x = sx;
					y += item.Height + 20 + Margin;
				}

				++index;
			}
		}

		public void SetBorder(int border)
		{
			SelectionBorder = border;
		}

		public void SetBorderColor(Color col)
		{
			SelectionColor = col;
		}

		public void SetItemDimension(int w, int h)
		{
			ItemW = w;
			ItemH = h;
		}

		public void Push(GridItem item)
		{
			Grid.Add(item);
		}
	}
}