using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Entity;
using Level;
using Gfx;

namespace Inventory
{
	public enum InvType
	{
		Cannon = 1, Dispenser = 2, Mine = 3, Turret = 4, Flag = 5, Unknown = 0
	}

	public class InvItem
	{
		public bool Used = false;

		public int Amount = 1;

		private static List<InvItem> FullInventory = new List<InvItem>();

		public virtual InvType Type { get { return InvType.Unknown; } }

		public GEntity Parent;

		public InvItem() { }

		public InvItem(GEntity parent)
		{
			this.Parent = parent;
		}

		static InvItem()
		{
			FullInventory.Add(new CannonInv());
			FullInventory.Add(new TurretInv());
			FullInventory.Add(new MineInv());
			FullInventory.Add(new DispenserInv());
		}

		public virtual int ImageIconIndex { get { return 0; } }                       // For the dashboard
		public virtual int[] ItemImageIndexes { get { return new int[] { 0, 0 }; } }  // For the game field
		public virtual int HologramIndex { get { return 0; } }
		public virtual int ActivationKey { get { return 0; } }

		public virtual void Render(GBitmap screen, int playerId, int x, int y, Directions Direction)
		{
			int[] Offs = GetRenderOffsets(Direction);
			Art.GRAPHICS[ItemImageIndexes[0], ItemImageIndexes[1]].ChangeHue(UnitColors.GetUnitHue(playerId));
			screen.Blit(Art.Rotate(Art.GRAPHICS[ItemImageIndexes[0], ItemImageIndexes[1]], (int)Direction * 90), x + Offs[0], y + Offs[1]);
		}

		public virtual void RenderHologram(GBitmap screen, int id, int x, int y)
		{
			int[] Offs = GameLevel.GetNewEntityOffsets(id);
			screen.Blit(Art.GRAPHICS[HologramIndex, 17], x + Offs[0], y + Offs[1]);
		}

		public virtual void Use()
		{
			if (Amount > 1)
			{
				--Amount;
			}
			else
			{
				Used = true;
			}
		}

		public virtual void Use(int playerId) { }

		public bool IsSelected()
		{
			return GameLevel.CurrentPlayer.CurrentInvItemAKey == ActivationKey;
		}

		public override string ToString()
		{
			return "inventory-item";
		}

		public static int[] GetRenderOffsets(Directions Direction)
		{
			int xo = 0;
			int yo = 0;

			if (Direction == Directions.Up)
			{
				xo -= 2;
				yo -= 8;
			}
			if (Direction == Directions.Right)
			{
				xo += 4;
				yo -= 2;
			}
			if (Direction == Directions.Down)
			{
				yo += 4;
				xo -= 2;
			}
			if (Direction == Directions.Left)
			{
				xo -= 8;
				yo -= 2;
			}

			return new int[] { xo, yo };
		}

		public static InvItem FindInvItem(List<InvItem> Inventory, string Name)
		{
			InvItem FoundItem = new InvItem();

			foreach (InvItem I in Inventory)
			{
				if (I.ToString().Equals(Name))
				{
					FoundItem = I;
					break;
				}
			}

			return FoundItem;
		}

		public static InvItem FindInvItem(string Name)
		{
			return FindInvItem(GameLevel.CurrentPlayer.Inventory, Name);
		}

		public static InvItem GetInvItem(string Name)
		{
			return FindInvItem(FullInventory, Name);
		}

		public static string GetNameByIndex(int index)
		{
			return FullInventory[index].ToString();
		}

		public static InvItem GetPlayersInvItem(int Id, int Key)
		{
			InvItem Curr = null;
			foreach (InvItem I in GameLevel.GetPlayer(Id).Inventory)
			{
				if (I.ActivationKey == Key)
				{
					Curr = I;
				}
			}
			return Curr;
		}

		public static int GetPrevInvAKey(int Id, int CurrentKey)
		{
			int PrevKey = CurrentKey - 1;
			return GetPlayersInvItem(Id, PrevKey) != null ? PrevKey : GetPrevInvAKey(Id, PrevKey);
		}
	}
}