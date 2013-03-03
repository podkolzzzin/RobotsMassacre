using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Entity.Particle.Bonus;
using Robots_Massacre_Client;
using Gfx;
using Level;
using Inventory;

namespace Entity
{
	public partial class GEntity
	{
		public void SetTeam(Teams t)
		{
			this.Team = t;
		}

		protected virtual void OnBindingMasterMovingEvent() { }

		public virtual void Update()
		{
			if (BindingSlave)
			{
				X = BindedMasterEntityMoving.X;
				Y = BindedMasterEntityMoving.Y;
				OnBindingMasterMovingEvent();
			}
		}

		public virtual void Render(GBitmap screen) { }

		public void SetRange(int r)
		{
			EntityRange = new Range(X, Y, r);
			EntityRange.Owner = Owner;
		}

		public void UpdateRange()
		{
			if (EntityRange != null)
			{
				EntityRange.X = X;
				EntityRange.Y = Y;
			}
		}

		public bool IntersectsWith(GEntity E)
		{
			if (IsElliptic && !E.IsElliptic) return RectangleIntersectsWithCircle(E.iX, E.iY, E.W, E.H, iX, iY, R);
			else if (!IsElliptic && E.IsElliptic) return RectangleIntersectsWithCircle(iX, iY, W, H, E.iX, E.iY, E.R);
			else if (!IsElliptic && !E.IsElliptic) return new Rectangle((int)X, (int)Y, W, H).IntersectsWith(new Rectangle((int)E.X, (int)E.Y, E.W, E.H));
			return false;
		}

		public void BindMasterEntityMoving(GEntity MasterEntity)
		{
			this.BindedMasterEntityMoving = MasterEntity;
			Enabled = false;
			BindingSlave = true;
		}

		public void UnbindMasterEntityMoving()
		{
			OnBindingMasterMovingEvent();
			this.BindedMasterEntityMoving = null;
			Enabled = true;
			BindingSlave = false;
		}

		public void SetSlaveEntityMoving(GEntity SlaveEntity)
		{
			this.BindedSlaveEntityMoving = SlaveEntity;
			BindingMaster = SlaveEntity != null;
		}

		public GEntity GetSlaveEntityMoving()
		{
			return BindedSlaveEntityMoving;
		}

		public void MoveLeft(float Speed)
		{
			X -= Speed;
			Direction = Directions.Left;
		}

		public void MoveRight(float Speed)
		{
			X += Speed;
			Direction = Directions.Right;
		}

		public void MoveUp(float Speed)
		{
			Y -= Speed;
			Direction = Directions.Up;
		}

		public void MoveDown(float Speed)
		{
			Y += Speed;
			Direction = Directions.Down;
		}

		public void SetImmortalness(bool im)
		{
			Immortal = im;
		}

		public virtual void Remove()
		{
			Removed = true;
			Die();
		}

		public void Remove(GEntity ContactedWith)
		{
			Removed = true;
			Die(ContactedWith);
		}

		public virtual void Die() { }

		public virtual void Die(GEntity ContactedWith) { }

		public void Damage(int Damage)
		{
			if (!Immortal)
			{
				Health -= Damage;
				if (Health <= 0)
				{
					Health = 0;
					Remove();
				}
			}
		}

		public void Heal(int ToHealth)
		{
			Health += ToHealth;

			if (Health > 0)
			{
				Removed = false;
			}

			if (Health >= MaxHealth)
			{
				Health = MaxHealth;
			}
		}

		public virtual void Reanimate()
		{
			if (!Immortal)
			{
				Heal(MaxHealth);
			}
		}

		public virtual InvItem GetAsInvItem()
		{
			return new InvItem();
		}

		public void Enable()
		{
			Enabled = true;
		}

		public void Disable()
		{
			Enabled = false;
		}
	}
}