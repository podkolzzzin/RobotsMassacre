using Level;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Entity
{
	public enum Directions
	{
		Up = 0, Right = 1, Down = 2, Left = 3, Unknown = -1
	}

	public partial class GEntity
	{
		public float X, Y;

		// The integer coordinates
		public int iX { get { return (int)X; } }
		public int iY { get { return (int)Y; } }

		public int W, H;
		public int R = 0;

		public int Id;
		public int Owner;
		public Teams Team = Teams.NoTeam;
		public int MaxHealth;
		public int Health;
		public bool Immortal = false;
		public Directions Direction;
		public Range EntityRange;

		private GEntity BindedMasterEntityMoving;
		private GEntity BindedSlaveEntityMoving;

		public bool Removed = false;

		public bool HasFocus = false;
		public bool Enabled = true;
		public bool BindingMaster = false;
		public bool BindingSlave = false;

		// Object physical properties
		public virtual bool CanPass { get { return true; } }
		public virtual bool CanBulletPass { get { return false; } }
		public virtual bool HasRange { get { return false; } }
		public virtual bool IsMetallic { get { return false; } }
		public virtual bool IsBrick { get { return false; } }
		public virtual bool IsElliptic { get { return false; } }
		public virtual bool IsStatic { get { return false; } }

		// In-game interactions
		public virtual bool Draggable { get { return false; } }

		public virtual int Type { get { return EntityType.UNKNOWN; } }
	}
}