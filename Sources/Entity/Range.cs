using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entity
{
	public class Range : GEntity
	{
		public override bool IsElliptic { get { return true; } }

		public Range(float X, float Y, int R) : base(X, Y, R) { }

		public void SetRadius(int r)
		{
			this.R = r;
		}
	}
}