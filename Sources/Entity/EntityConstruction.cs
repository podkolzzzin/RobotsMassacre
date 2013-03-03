using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Entity
{
	public partial class GEntity
	{
		public GEntity() { }

		public GEntity(float X, float Y, int W, int H)
		{
			this.X = X;
			this.Y = Y;
			this.W = W;
			this.H = H;
		}

		public GEntity(float X, float Y, int R)
		{
			this.X = X;
			this.Y = Y;
			this.R = R;
		}

		public GEntity(int Owner, float X, float Y, int W, int H, Directions Direction)
		{
			this.Owner = Owner;
			this.X = X;
			this.Y = Y;
			this.W = W;
			this.H = H;
			this.Direction = Direction;
		}

		public GEntity(float X, float Y, int W, int H, int Health, int MaxHealth)
		{
			this.X = X;
			this.Y = Y;
			this.W = W;
			this.H = H;
			this.Health = Health;
			this.MaxHealth = MaxHealth;
		}

		public GEntity(float X, float Y, int W, int H, bool Immortal)
		{
			this.X = X;
			this.Y = Y;
			this.W = W;
			this.H = H;
			this.Immortal = Immortal;
		}

		public GEntity(int Id, float X, float Y, int W, int H, Directions Direction, int Health, int MaxHealth)
		{
			this.Id = Id;
			this.X = X;
			this.Y = Y;
			this.W = W;
			this.H = H;
			this.Direction = Direction;
			this.Health = Health;
			this.MaxHealth = MaxHealth;
		}

		public GEntity(int Id, int Owner, float X, float Y, int W, int H, int Health, int MaxHealth)
		{
			this.Id = Id;
			this.Owner = Owner;
			this.X = X;
			this.Y = Y;
			this.W = W;
			this.H = H;
			this.Health = Health;
			this.MaxHealth = MaxHealth;
		}
	}
}