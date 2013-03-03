using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Entity.Particle;
using Entity.Particle.Bonus;
using Gui.Components;
using Level;
using Gfx;
using Robots_Massacre_Client;

namespace Entity
{
	public class Bullet : GEntity
	{
		public const float SPEED = 8.0f;
		public const int DAMAGE = 20;

		private bool AP;
		private bool IsTurret = false;

		// Getters take bonuses into account
		public int BDamage
		{
			get
			{
				int DAmpl = 1;
				if (AP) DAmpl = 3;
				return DAMAGE * DAmpl;
			}
		}

		public float Speed
		{
			get
			{
				float SAmpl = 1.0f;
				if (AP) SAmpl = 1.5f;
				return SPEED * SAmpl;
			}
		}

		public override int Type { get { return EntityType.BULLET; } }

		public Bullet(float x, float y, int Owner, Directions Direction, bool ap)
			: base(Owner, x, y, 4, 4, Direction)
		{
			this.AP = ap;
		}

		public Bullet(float x, float y, int Owner, Directions Direction, bool ap, bool IsTurret)
			: base(Owner, x, y, 4, 4, Direction)
		{
			this.AP = ap;
			this.IsTurret = IsTurret;
		}

		public override void Update()
		{
			if (Direction == Directions.Left) MoveLeft(Speed);
			if (Direction == Directions.Right) MoveRight(Speed);
			if (Direction == Directions.Up) MoveUp(Speed);
			if (Direction == Directions.Down) MoveDown(Speed);

			List<GEntity> IntersectingEntities = GameLevel.GetIntersectingEntities(this);
			foreach (GEntity Entity in IntersectingEntities)
			{
				if (!Entity.CanBulletPass)
				{
					Entity.Damage(BDamage);
					if (Entity.IsMetallic || Entity.IsBrick) Remove(Entity);
					else Remove();
				}
			}

			List<Player> IntersectingEnemies = GameLevel.GetIntersectingPlayers(this, IntersectionType.BY_DIFF_OWNER);
			foreach (Player Enemy in IntersectingEnemies)
			{
				if ((GameLevel.GetMode() == Modes.TeamDeathmatch || GameLevel.GetMode() == Modes.CaptureFlag) && Player.GetTeamById(Enemy.Id) != Player.GetTeamById(Owner))
				{
					Enemy.Damage(BDamage);

					if (Player.IsMe(Owner))
					{
						++GameComponent.Gs.IntStatsHits;
						if (Enemy.Removed)
						{
							Player.IncrementKills(Owner);
						}
					}
				}

				Remove(Enemy);
			}

			List<Bullet> IntersectingBullets = GameLevel.GetIntersectingBullets(this);
			foreach (Bullet B in IntersectingBullets)
			{
				B.Remove();
				this.Remove();
			}

			// Dispose the memory
			if (X <= 0 || Y <= 0 || X >= GameLevel.MAX_LEVEL_WIDTH || Y >= GameLevel.MAX_LEVEL_HEIGHT)
			{
				Remove();
			}
		}

		public override void Render(GBitmap screen)
		{
			int BulletType = 1;
			if (AP) BulletType = 0;
			screen.Blit(Art.GRAPHICS[(int)Direction, BulletType], iX, iY);
		}

		public override void Die(GEntity ContactedWith)
		{
			if (ContactedWith.IsMetallic)
			{
				Sound.MetalHit.Play();
				GameLevel.AddParticle(new Spark(X, Y, Direction));
			}
			else if (ContactedWith.IsBrick)
			{
				Sound.BrickHit.Play();
				GameLevel.AddParticle(new BrickDust(X, Y, Direction));
			}
		}
	}
}