using Entity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Inventory
{
	public class FlagInv : InvItem
	{
		public override int ImageIconIndex { get { return 8; } }
		public override int[] ItemImageIndexes { get { return new int[] { 7, 5 }; } }

		public override InvType Type { get { return InvType.Flag; } }

		public FlagInv(GEntity parent) : base(parent) { }

		public override string ToString()
		{
			return "inventory-flag";
		}
	}
}