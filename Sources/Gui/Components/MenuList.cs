using Gfx;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Gui.Components
{
	public enum ItemIndexes
	{
		First = 1, Last = 2
	}

	public class MenuList : GuiScreen
	{
		private string[] Items;
		private int[] AfterSelectedViews;

		private int Selected = 0;
		private int StartY = 20;
		private int FontSize = 2;

		public MenuList(InputHandler Input, string[] Items)
			: base(Input, false, false, false, true)
		{
			this.Items = Items;
		}

		public MenuList(InputHandler Input, string[] Items, int[] AfterSelectedViews)
			: base(Input, false, false, false, true)
		{
			this.Items = Items;
			this.AfterSelectedViews = AfterSelectedViews;
		}

		public override void Update()
		{
			if (Input.Down.Clicked) ++Selected;
			if (Input.Up.Clicked) --Selected;

			int Len = Items.Length;
			if (Selected < 0) Selected += Len;
			if (Selected >= Len) Selected -= Len;

			if (Input.Attack.Clicked && AfterSelectedViews != null && AfterSelectedViews[Selected] != -1)
			{
				GameComponent.SetCurrentScreen(AfterSelectedViews[Selected]);
			}
		}

		public override void Render(GBitmap screen)
		{
			for (int i = 0; i < Items.Length; ++i)
			{
				string Output = Items[i];

				if (i == Selected)
				{
					Output = "> " + Output + " <";
				}

				GFont.WriteXCenter(screen, Output, FontSize, StartY + i * 20);
			}
		}

		public void SetStartY(int sy)
		{
			this.StartY = sy;
		}

		public void SetFontSize(int s)
		{
			this.FontSize = s;
		}

		public int GetSelected()
		{
			return Selected;
		}

		public bool Is(int index)
		{
			return Input.Attack.Clicked && GetSelected() == index;
		}

		public bool Is(ItemIndexes index)
		{
			int int_index = 0;
			if (index == ItemIndexes.First) int_index = 0;
			if (index == ItemIndexes.Last) int_index = Items.Length - 1;
			return Input.Attack.Clicked && GetSelected() == int_index;
		}
	}
}