using Gfx;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;

namespace Gui.Components
{
	class ComboBox : GuiComponent
	{
		public List<GBitmap> Items { get; set; }
		public int SelectedItem;
		public int InsideMargin { get; set; }
		public ComboBox(InputHandler Input)
			: base(Input)
		{
			Items = new List<GBitmap>();
			InsideMargin = 5;
			SelectedItem = 0;
		}
		public override void Update()
		{
			if (!IsFocused)
				return;
			if (Input.Up.Clicked || Input.Right.Clicked)
				SelectedItem++;
			else if (Input.Down.Clicked || Input.Left.Clicked)
				SelectedItem--;
			if (SelectedItem < 0)
				SelectedItem = Items.Count - 1;

			if (Items.Count == 0)
				SelectedItem = -1;
			else
				SelectedItem %= Items.Count;
		}

		public override void Render(GBitmap screen)
		{
			int x = X + InsideMargin;
			for (int i = 0; i < Items.Count; i++)
			{
				if (i == SelectedItem)
					screen.DrawRect(Color.White, 4, x - 2, Y + InsideMargin - 2, Items[i].Width + 4, Items[i].Height + 4);
				screen.Blit(Items[i], x, Y + InsideMargin);
				x += Items[i].Width + InsideMargin;
			}
		}

		public bool Is(int index)
		{
			return Input.Attack.Clicked && SelectedItem == index;
		}
	}
}