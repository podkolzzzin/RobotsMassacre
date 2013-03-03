using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Entity.Particle;
using Entity.Particle.Bonus;
using Inventory;
using Level;
using Gfx;
using Gui.Components;

namespace Entity
{
	public class Dispenser : GEntity
	{
		private const int WIDTH = 30;
		private const int HEIGHT = 30;
		private const int MAX_HP = 75;
		private const int DISPENSE_RANGE = 225;

		public override bool CanPass { get { return !Enabled; } }
		public override bool HasRange { get { return true; } }
		public override bool IsMetallic { get { return true; } }
		public override bool Draggable { get { return true; } }

		public override int Type { get { return EntityType.DISPENSER; } }

		private const int SKIP_RENEW_TICKS = 1;
		private int SkippedRenewTicks = 0;

		private int Energy = 1125;

		public Dispenser(int Owner, float x, float y)
			: base(Owner, x, y, WIDTH, HEIGHT, Directions.Unknown, MAX_HP, MAX_HP)
		{
			this.SetRange(DISPENSE_RANGE);
		}

		public Dispenser(int Owner, float x, float y, int health)
			: base(Owner, x, y, WIDTH, HEIGHT, Directions.Unknown, health, MAX_HP)
		{
			this.SetRange(DISPENSE_RANGE);
		}

		protected override void OnBindingMasterMovingEvent()
		{
			UpdateRange();
		}

		public override void Update()
		{
			if (Enabled)
			{
				base.Update();

				List<Player> PlayersInRange = GameLevel.GetIntersectingPlayers(EntityRange, IntersectionType.BY_EQUAL_OWNER);

				if (SkippedRenewTicks++ > SKIP_RENEW_TICKS)
				{
					SkippedRenewTicks = 0;
					foreach (Player P in PlayersInRange)
					{
						if (P.Health < P.MaxHealth)
						{
							P.Heal(1);
							--Energy;
							GameLevel.AddParticle(new DispenseBeam(this, P, DispenseBeamType.Heal));
						}

						if (P.Ammunition < P.MAX_AMMUNITION)
						{
							P.AddAmmunition(1);
							--Energy;
							GameLevel.AddParticle(new DispenseBeam(this, P, DispenseBeamType.Ammunition));
						}
					}
				}

				if (Energy <= 0)
				{
					Remove();
				}
			}
		}

		public override void Render(GBitmap screen)
		{
			if (Enabled)
			{
				if (HasFocus)
				{
					screen.DrawRect(Color.White, 2, iX - 2, iY - 2, 32, 32);
					screen.FillCircle(Color.FromArgb(100, 255, 255, 255), EntityRange.iX - EntityRange.R / 2 + W / 2, EntityRange.iY - EntityRange.R / 2 + H / 2, EntityRange.R, EntityRange.R);

					Color col = Color.Green;
					if (Health < MaxHealth * 1 / 3) col = Color.Red;
					else if (Health < MaxHealth * 2 / 3) col = Color.Yellow;
					screen.FillRect(col, iX, iY + H + 6, (int)((double)Health / MaxHealth * 30), 4);
				}

				screen.Blit(Art.GRAPHICS[9, 1], iX, iY);
				GFont.Write(screen, "" + EntityRange.Owner, 1, iX - screen.XOffset, iY - screen.YOffset);
			}
		}

		public override string ToString()
		{
			return (new DispenserInv()).ToString();
		}
	}
}