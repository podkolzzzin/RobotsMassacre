using Gfx;
using Gui.Components;
using Inventory;
using Level;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Entity
{
	public class Flag : GEntity
	{
		public override bool CanBulletPass { get { return true; } }
		public override bool CanPass { get { return !Enabled; } }

		public override int Type { get { return EntityType.FLAG; } }

		public Flag(int x, int y, Teams team)
			: base(x, y, 30, 30)
		{
			this.Team = team;
		}

		public override void Update()
		{
			base.Update();

			int offset = 15;

			List<Player> IntersectingPlayers = GameLevel.GetIntersectingPlayers(new GEntity(X - offset / 2, Y - offset / 2, W + offset, H + offset));
			foreach (Player player in IntersectingPlayers)
			{
				if (player.Team != Team) player.Hand(this);
				else if (player.Team == Team && player.IsHolding())
				{
					GameLevel.Score.Increment(player.Team);
					player.StopHolding();
				}
			}
		}

		public override void Render(GBitmap screen)
		{
			if (Enabled)
			{
				screen.Blit(Art.GRAPHICS[4 - (int)Team, 18], iX, iY);
			}
		}

		public override Inventory.InvItem GetAsInvItem()
		{
			return new FlagInv(this);
		}
	}
}